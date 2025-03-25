<?php

namespace App\Controller;

use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageOperationStatus;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController; 
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Exception;

#[Route(path: '/profil')]
class GTMCompressorSSEController extends AbstractController
{
    public const TRACK_COMPRESSION_PROGRESS_URL = '/profil/narzedzia-graficzne/sse/sledzenie-kompresji';
    public const GET_COMPRESSION_STATUS_URL = '/profil/narzedzia-graficzne/sse/pobierz-status-kompresji';
    private const MAX_CONNECTION_TIMEOUT = 900; // 15 minut
    private const NO_PROGRESS_TIMEOUT = 1200;   // 20 minut
    private const KEEP_ALIVE_INTERVAL = 30;     // 30 sekund
    private const POLL_INTERVAL = 100000;       // 0.1 sekundy (w mikrosekundach)

    public function __construct(
        private LoggerInterface $logger,
        private TrackCompressionProgressInterface $compressionTracker,
        private GTMImageRepository $jobRepository,
        private EntityManagerInterface $entityManager
    ) {}

    /**
     * Nawiązuje długotrwałe połączenie SSE, które monitoruje postęp w czasie rzeczywistym
     * Utrzymuje otwarte połączenie i wysyła aktualizacje, gdy stan zadania się zmienia.
     * Kończy działanie dopiero po zakończeniu zadania lub przerwaniu połączenia
     */
    #[Route(path: "/narzedzia-graficzne/sse/sledzenie-kompresji/{processHash}", name: 'gtm_compressor_sse_compression_tracking', methods: ['GET'])]
    public function trackCompressionProgress(string $processHash): Response
    {
        // Zamknij sesję przed rozpoczęciem strumienia
        $this->closeSession();

        $this->compressionTracker->initTracking($processHash);

        $this->logger->debug('Rozpoczęcie połączenia SSE', ['processHash' => $processHash]);

        try {
            return new StreamedResponse(function () use ($processHash) {
                $this->configureSSEHeaders();
                $this->streamProgressUpdates($processHash);
            });
        } catch (Exception $e) {
            $this->logger->error('Błąd podczas obsługi SSE', [
                'processHash' => $processHash,
                'error' => $e->getMessage()
            ]);

            return $this->createErrorResponse($e->getMessage());
        }
    }

    /** Zamyka sesję PHP, aby nie blokować innych żądań */
    private function closeSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
    }

    /** Konfiguruje nagłówki HTTP dla SSE */
    private function configureSSEHeaders(): void
    {
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no'); // Wyłącza buforowanie Nginx

        // Konfiguracja PHP dla długotrwałego połączenia
        ignore_user_abort(true);
        set_time_limit(0);
    }

    /** Główna pętla wysyłająca aktualizacje postępu */
    private function streamProgressUpdates(string $processHash): void
    {
        $lastProgress = null;
        $startTime = time();
        $lastChangeTime = time();
        $lastKeepAliveTime = time(); 

        // Pętla z ograniczeniem czasowym
        while (time() - $startTime < self::MAX_CONNECTION_TIMEOUT) {
            // Pobierz aktualny postęp
            $progressData = $this->compressionTracker->getProgress($processHash);
            $this->compressionTracker->showProgressLog($processHash);

            // Obsługa braku danych o postępie
            if ($progressData === null) {   

                $this->sendSSEMessage('pending', 0);

                sleep(1); // Czekamy chwilę, zanim ponowimy próbę
                continue;
            }

            $progressValue = $progressData['progress'];
            $progressStatus = $progressData['status'];

            // Obsługa zakończenia kompresji
            if ($progressValue === 100) { 

                $this->sendSSEMessage('completed', $progressValue);

                $this->logger->info('Kompresja zakończona', [
                    'processHash' => $processHash,
                    'status' => $progressStatus
                ]);

                break; 

                // Obsługa zmiany postępu
            } else if ($progressValue !== $lastProgress) { 

                $this->sendSSEMessage('progress', $progressValue);

                $lastProgress = $progressValue;
                $lastChangeTime = time();
            
                // Obsługa timeout bez zmian postępu
            } else if (time() - $lastChangeTime > self::NO_PROGRESS_TIMEOUT) { 

                $this->sendSSEMessage('timeout', $progressValue);

                $this->logger->warning('Timeout bez zmian postępu', [
                    'processHash' => $processHash,
                    'lastProgress' => $lastProgress
                ]);

                break;
            } else {
                $this->sendSSEMessage('pending', 0);
            }

            // Wysyłanie komunikatu keep-alive
            // if (time() - $lastKeepAliveTime >= self::KEEP_ALIVE_INTERVAL) {
            //     echo ": keep-alive\n\n";
            //     $lastKeepAliveTime = time();
            //     $this->flushOutput();
            // }

            // Opróżnienie bufora wyjścia
            $this->flushOutput();

            // Krótsze oczekiwanie dla lepszej responsywności
            usleep(self::POLL_INTERVAL);

            // Sprawdzenie czy klient jest nadal połączony
            if (connection_aborted()) {
                $this->logger->info('Klient rozłączony', ['processHash' => $processHash]);
                break;
            }
        }
    }

    /** Wysyła zdarzenie SSE do klienta */
    private function sendSSEEvent(string $eventName, array $data): void
    {
        $jsonData = json_encode($data);

        echo "event: $eventName\n";
        echo "data: $jsonData\n\n";
        
        echo str_pad('', 1024, ' '); // Zapobieganie problemom z buforowaniem 

        $this->flushOutput();
    }

    /** Opróżnia bufor wyjścia */
    private function flushOutput(): void
    {
        ob_flush();
        flush();
    }

    /** Tworzy odpowiedź z błędem */
    private function createErrorResponse(string $errorMessage): Response
    {
        $response = new Response();
        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');

        $this->logger->error('#####################################################');
        $this->logger->error("Błąd !!!", [
            'progress' => 0,
            'status' => ImageOperationStatus::FAILED,
            'message' => $errorMessage
        ]);
        $this->logger->error('#####################################################');

        $response->setContent("event: error\ndata: $errorMessage\n\n");

        return $response;
    } 



 































    #[Route(path: "/sse/test", name: "sse_test")]
    public function sseTest(LoggerInterface $logger): Response
    {
        $response = new StreamedResponse();
 
        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no'); // Wyłączenie buforowania w nginx

        $response->setCallback(function () use ($logger) {
            try {
                $progress = 0;

                while ($progress <= 100) {  
                    $eventType = ($progress === 100) ? 'completed' : 'progress'; 

                    // Logowanie postępu
                    $logger->debug('---------------------------------------------------------------------------------');
                    $logger->debug('Aktualny postęp: ' . $progress); 
                    $logger->debug('---------------------------------------------------------------------------------');

                    // Wysyłanie wiadomości SSE
                    $this->sendSSEMessage($eventType, $progress);

                    // Opóźnienie dla symulacji procesu
                    if ($progress < 100) {
                        usleep(250000); // 0.25 sekundy
                    }

                    // Sprawdzenie, czy klient się rozłączył
                    if (connection_aborted()) {
                        $logger->info("Klient rozłączył się. Przerywam SSE.");
                        break;
                    }

                    $progress++;
                }
            } catch (Exception $e) { 
                // Logowanie błędu
                $logger->error("#############################################################################");
                $logger->error($e->getMessage());
                $logger->error("#############################################################################"); 
            }
        });

        return $response;
    }

    /** Funkcja pomocnicza do wysyłania komunikatów SSE. */
    private function sendSSEMessage(string $event, string $data): void
    {
        echo "event: $event\n";
        echo "data: $data\n\n";
        echo str_pad('', 1024, ' '); // Zapobieganie problemom z buforowaniem

        ob_flush();
        flush();  // Wymusza wysłanie danych do klienta
    }





    // #[Route(path: "/sse/test", name: "sse_test")]
    // public function sseTest(): Response
    // {
    //     $response = new StreamedResponse();
    //     $response->headers->set('Content-Type', 'text/event-stream');
    //     $response->headers->set('Cache-Control', 'no-cache');
    //     $response->headers->set('Connection', 'keep-alive');
    //     $response->headers->set('X-Accel-Buffering', 'no'); // Wyłączenie buforowania w nginx 

    //     ob_implicit_flush(true);  // Włącz natychmiastowe wysyłanie danych

    //     try {
    //         // Wyłącz buforowanie Symfony
    //         ob_implicit_flush(true);
    //         ob_end_flush();  

    //         $response->setCallback(function () {
    //             $progress = 0;

    //             while ($progress <= 100) {  
    //                 $eventType = ($progress === 100) ? 'completed' : 'progress'; 

    //                 $this->logger->debug('---------------------------------------------------------------------------------');
    //                 $this->logger->debug('Aktualny postęp: ' . $progress); 
    //                 $this->logger->debug('---------------------------------------------------------------------------------');

    //                 echo "event: $eventType\n";
    //                 echo "data: $progress\n\n";
 
    //                 echo str_pad('', 1024, ' '); 

    //                 if (ob_get_contents()) {
    //                     ob_end_clean();  // Wyczyść poprzedni bufor, jeśli istnieje
    //                     ob_end_flush();
    //                 }   
                    
    //                 flush();  // Wymusza natychmiastowe wysłanie danych do klienta

    //                 if ($progress < 100) {
    //                     usleep(750000); // 0.75 sekundy
    //                 }

    //                 if (connection_aborted()) {
    //                     break;
    //                 }

    //                 $progress++;
    //             }
    //         });
    //     } catch (Exception $e) { 
    //         $this->logger->error("#############################################################################");
    //         $this->logger->error($e->getMessage());
    //         $this->logger->error("#############################################################################"); 
    //     }

    //     return $response;
    // }




    #[Route(path: "/narzedzia-graficzne/sse/test", name: 'gtm_compressor_sse_test', methods: ['GET'])]
    public function testSSE(): Response
    {
        // $this->closeSession();

        $this->logger->debug('Rozpoczęcie testowego połączenia SSE');

        try {
            return new StreamedResponse(function () {
                $this->configureSSEHeaders();

                $progress = 0;
                $startTime = time();
                $lastKeepAliveTime = time();

                // $this->sendSSEEvent('start', []);

                while (time() - $startTime < self::MAX_CONNECTION_TIMEOUT) {

                    $this->sendSSEEvent('progress', [
                        'progress' => $progress,
                        'message' => ''
                    ]);

                    if ($progress === 100) {

                        $this->sendSSEEvent('completed', [
                            'progress' => $progress,
                            'message' => ''
                        ]);

                        $this->logger->info('Test zakończony');

                        break;
                    }

                    // if (time() - $lastKeepAliveTime >= self::KEEP_ALIVE_INTERVAL) {
                    //     echo ": keep-alive\n\n";
                    //     $lastKeepAliveTime = time();
                    //     $this->flushOutput();
                    // }

                    // $this->flushOutput();

                    usleep(self::POLL_INTERVAL);

                    if (connection_aborted()) {
                        $this->logger->info('Klient rozłączony');
                        break;
                    }

                    $progress++;
                }
            });
        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas obsługi SSE', [
                'error' => $e->getMessage()
            ]);

            return $this->createErrorResponse('Wewnętrzny błąd serwera');
        }
    }
}
