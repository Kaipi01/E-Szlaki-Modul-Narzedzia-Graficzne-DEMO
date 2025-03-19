<?php

namespace App\Controller;
 
use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageOperationStatus;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/profil')]
class GTMCompressorSSEController extends AbstractController
{
    public const TRACK_COMPRESSION_PROGRESS_URL = '/profil/narzedzia-graficzne/sse/sledzenie-kompresji';
    public const GET_COMPRESSION_STATUS_URL = '/profil/narzedzia-graficzne/sse/pobierz-status-kompresji'; 
    private const MAX_CONNECTION_TIMEOUT = 900; // 15 minut
    private const NO_PROGRESS_TIMEOUT = 360;    // 6 minut
    private const KEEP_ALIVE_INTERVAL = 30;     // 30 sekund
    private const POLL_INTERVAL = 250000;       // 0.25 sekundy (w mikrosekundach)

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
    #[Route("/narzedzia-graficzne/sse/sledzenie-kompresji/{processId}", name: 'gtm_compressor_sse_compression_tracking', methods: ['GET'])]
    public function trackCompressionProgress(string $processId): Response
    {
        // Zamknij sesję przed rozpoczęciem strumienia
        $this->closeSession();

        $this->logger->debug('Rozpoczęcie połączenia SSE', ['processId' => $processId]);

        try {
            return $this->createSSEResponse($processId);

        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas obsługi SSE', [
                'processId' => $processId,
                'error' => $e->getMessage()
            ]);

            return $this->createErrorResponse('Wewnętrzny błąd serwera');
        }
    }

    /** Zamyka sesję PHP, aby nie blokować innych żądań */
    private function closeSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
    }

    /** Tworzy odpowiedź SSE */
    private function createSSEResponse(string $processId): StreamedResponse
    {
        return new StreamedResponse(function () use ($processId) {
            $this->configureSSEHeaders();
            $this->streamProgressUpdates($processId);
        });
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
    private function streamProgressUpdates(string $processId): void
    {
        $lastProgress = null;
        $startTime = time();
        $lastChangeTime = time();
        $lastKeepAliveTime = time();

        // Pętla z ograniczeniem czasowym
        while (time() - $startTime < self::MAX_CONNECTION_TIMEOUT) {
            // Pobierz aktualny postęp
            $progressData = $this->compressionTracker->getProgress($processId);

            // Obsługa braku danych o postępie
            if ($progressData === null) {

                $this->sendSSEEvent('error', [
                    'progress' => 0,
                    'status' => ImageOperationStatus::PENDING,
                    'message' => 'No progress data found'
                ]);
                break;
            }

            $progressValue = $progressData['progress'];
            $progressStatus = $progressData['status'];

            // Obsługa zakończenia kompresji
            if ($progressValue === 100) {

                $this->sendSSEEvent('completed', [
                    'progress' => $progressValue,
                    'status' => $progressStatus,
                    'message' => ''
                ]);

                $this->logger->info('Kompresja zakończona', [
                    'processId' => $processId,
                    'status' => $progressStatus
                ]);

                break;
            }

            // Obsługa zmiany postępu
            if ($progressValue !== $lastProgress) {
                $this->sendSSEEvent('progress', [
                    'progress' => $progressValue,
                    'status' => $progressStatus,
                    'message' => ''
                ]);

                $lastProgress = $progressValue;
                $lastChangeTime = time();
            }
            // Obsługa timeout bez zmian postępu
            else if (time() - $lastChangeTime > self::NO_PROGRESS_TIMEOUT) {

                $this->sendSSEEvent('timeout', [
                    'progress' => $progressValue,
                    'status' => $progressStatus,
                    'message' => "No progress updates for " . self::NO_PROGRESS_TIMEOUT . " seconds"
                ]);

                $this->logger->warning('Timeout bez zmian postępu', [
                    'processId' => $processId,
                    'lastProgress' => $lastProgress
                ]);

                break;
            }

            // Wysyłanie komunikatu keep-alive
            if (time() - $lastKeepAliveTime >= self::KEEP_ALIVE_INTERVAL) {
                echo ": keep-alive\n\n";
                $lastKeepAliveTime = time();
                $this->flushOutput();
            }

            // Opróżnienie bufora wyjścia
            $this->flushOutput();

            // Krótsze oczekiwanie dla lepszej responsywności
            usleep(self::POLL_INTERVAL);

            // Sprawdzenie czy klient jest nadal połączony
            if (connection_aborted()) {
                $this->logger->info('Klient rozłączony', ['processId' => $processId]);
                break;
            }
        }
    }

    /** Wysyła zdarzenie SSE do klienta */
    private function sendSSEEvent(string $eventName, array $data): void
    {
        $jsonData = json_encode($data);

        echo "event: {$eventName}\n";
        echo "data: {$jsonData}\n\n";

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

        $data = json_encode([
            'progress' => 0,
            'status' => ImageOperationStatus::FAILED,
            'message' => $errorMessage
        ]);

        $response->setContent("event: error\ndata: {$data}\n\n");

        return $response;
    }
}




// namespace App\Controller;
 
// use App\Repository\GTMImageRepository;
// use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
// use App\Service\GraphicsToolsModule\Utils\DTO\ImageOperationStatus;
// use Doctrine\ORM\EntityManagerInterface;
// use Psr\Log\LoggerInterface;
// use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
// use Symfony\Component\HttpFoundation\Response;
// use Symfony\Component\HttpFoundation\StreamedResponse;
// use Symfony\Component\Routing\Annotation\Route;

// #[Route('/profil')]
// class GTMCompressorSSEController extends AbstractController
// {
//     public const TRACK_COMPRESSION_PROGRESS_URL = '/profil/narzedzia-graficzne/sse/sledzenie-kompresji';
//     public const GET_COMPRESSION_STATUS_URL = '/profil/narzedzia-graficzne/sse/pobierz-status-kompresji';

//     public function __construct(
//         private LoggerInterface $logger,
//         private TrackCompressionProgressInterface $compressionTracker,
//         private GTMImageRepository $jobRepository,
//         private EntityManagerInterface $entityManager
//     ) {}


//     /**
//      * Nawiązuje długotrwałe połączenie SSE, które monitoruje postęp w czasie rzeczywistym
//      * Utrzymuje otwarte połączenie i wysyła aktualizacje, gdy stan zadania się zmienia.
//      * Kończy działanie dopiero po zakończeniu zadania lub przerwaniu połączenia
//      */
//     #[Route("/narzedzia-graficzne/sse/sledzenie-kompresji/{processId}", name: 'gtm_compressor_sse_compression_tracking', methods: ['GET'])]
//     public function track_compression_progress(string $processId): Response
//     {
//         // Zamknij sesję przed rozpoczęciem strumienia
//         if (session_status() === PHP_SESSION_ACTIVE) {
//             session_write_close();
//         }
//         $response = new Response();

//         $this->logger->debug('Rozpoczęcie połączenia SSE');

//         try {

//             $response = new StreamedResponse(function () use ($processId) {
//                 // Ustawienie nagłówków SSE
//                 header('Content-Type: text/event-stream');
//                 header('Cache-Control: no-cache');
//                 header('Connection: keep-alive');
//                 header('X-Accel-Buffering: no'); // Wyłącza buforowanie Nginx

//                 // Ignorowanie rozłączenia klienta
//                 ignore_user_abort(true);

//                 // Ustawienie czasu wykonania skryptu
//                 set_time_limit(0);

//                 $lastProgress = null;
//                 $startTime = time();
//                 $timeout = 900; // 10 minut maksymalnego czasu połączenia
//                 $noChangeTimeout = 360; // 6 minuta bez zmian powoduje zakończenie
//                 $lastChangeTime = time();
//                 $lastKeepAliveTime = time();

//                 // Pętla z ograniczeniem czasowym
//                 while (time() - $startTime < $timeout) {

//                     $progressData = $this->compressionTracker->getProgress($processId);
//                     $progressValue = $progressData ? $progressData['progress'] : 0;
//                     $progressStatus = $progressData ? $progressData['status'] : ImageOperationStatus::PENDING;

//                     if ($progressData === null) {
//                         $data = json_encode(['progress' => $progressValue, 'status' => $progressStatus, 'message' => 'No progress data found']);

//                         echo "event: error\n";
//                         echo "data: " . $data . "\n\n";
//                         break;
//                     }

//                     // Jeśli postęp wynosi 100%, kończymy strumień
//                     if ($progressValue === 100) {
//                         $data = json_encode(['progress' => $progressValue, 'status' => $progressStatus, 'message' => '']);

//                         echo "event: completed\n";
//                         echo "data: " . $data . "\n\n";

//                         break;
//                     }

//                     if ($progressValue !== $lastProgress) {
//                         $data = json_encode(['progress' => $progressValue, 'status' => $progressStatus, 'message' => '']);

//                         echo "event: progress\n";
//                         echo "data: " . $data . "\n\n";
//                         $lastProgress = $progressValue;
//                         $lastChangeTime = time();
//                     } else if (time() - $lastChangeTime > $noChangeTimeout) {
//                         $data = json_encode(['progress' => $progressValue, 'status' => $progressStatus, 'message' => "No progress updates for $noChangeTimeout seconds"]);

//                         // Jeśli przez minutę nie było zmiany, kończymy połączenie
//                         echo "event: timeout\n";
//                         echo "data: " . $data . "\n\n";

//                         $this->logger->warning('Timeout bez zmian postępu', ['processId' => $processId, 'lastProgress' => $lastProgress]);
                        
//                         break;
//                     } 
                     
//                     if (time() - $lastKeepAliveTime >= 30) {
//                         echo ": keep-alive\n\n";
//                         $lastKeepAliveTime = time();
//                     }

//                     // Opróżnienie bufora wyjścia
//                     ob_flush();
//                     flush();

//                     // Krótsze oczekiwanie dla lepszej responsywności
//                     usleep(250000); // 0.25 sekundy

//                     // Sprawdzenie czy klient jest nadal połączony
//                     if (connection_aborted()) {
//                         break;
//                     }
//                 }
//             });
//         } catch (\Exception $e) { 
//             $this->logger->error($e->getMessage());

//             $data = json_encode(['progress' => 0, 'status' => ImageOperationStatus::FAILED, 'message' => 'Internal server error']);

//             echo "event: error\n";
//             echo "data: " . $data . "\n\n";
//         }

//         return $response;
//     }
// }