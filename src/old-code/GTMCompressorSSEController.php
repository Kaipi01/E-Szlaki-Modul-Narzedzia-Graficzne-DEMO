<?php

namespace App\Controller;

use App\Entity\GTMCompressionJob;
use App\Repository\GTMCompressionJobRepository;
use App\Service\GraphicsToolsModule\Contracts\TrackCompressionProgressInterface;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;

class GTMCompressorSSEController extends AbstractController
{
    private const END_STATUSES = ['completed', 'failed'];

    public const TRACK_COMPRESSION_PROGRESS_URL = '/narzedzia-graficzne/sse/sledzenie-kompresji';
    public const GET_COMPRESSION_STATUS_URL = '/narzedzia-graficzne/sse/pobierz-status-kompresji';

    public function __construct(
        private LoggerInterface $logger,
        private TrackCompressionProgressInterface $trackCompressionService,
        private GTMCompressionJobRepository $jobRepository,
        private EntityManagerInterface $entityManager
    ) {}


    /**
     * Nawiązuje długotrwałe połączenie SSE, które monitoruje postęp w czasie rzeczywistym
     * Utrzymuje otwarte połączenie i wysyła aktualizacje, gdy stan zadania się zmienia.
     * Kończy działanie dopiero po zakończeniu zadania lub przerwaniu połączenia
     */
    #[Route(self::TRACK_COMPRESSION_PROGRESS_URL . "/{imageId}", name: 'gtm_compressor_sse_compression_tracking', methods: ['GET'])]
    public function streamProgress(string $imageId): Response
    {
        // Zamknij sesję przed rozpoczęciem strumienia
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
        
        $response = new StreamedResponse(function() use ($imageId) {
            // Ustawienie nagłówków SSE
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no'); // Wyłącza buforowanie Nginx
            
            // Ignorowanie rozłączenia klienta
            ignore_user_abort(true);
            
            // Ustawienie czasu wykonania skryptu
            set_time_limit(0);
             
            $lastProgress = null;
            $startTime = time();
            // $timeout = 300; // 5 minut maksymalnego czasu połączenia
            // $noChangeTimeout = 60; // 1 minuta bez zmian powoduje zakończenie
            $timeout = 900; // 10 minut maksymalnego czasu połączenia
            $noChangeTimeout = 360; // 6 minuta bez zmian powoduje zakończenie
            $lastChangeTime = time();
            
            // Pętla z ograniczeniem czasowym
            while (time() - $startTime < $timeout) {
                $progress = $$this->trackCompressionService->getProgress($imageId);
                
                if ($progress !== $lastProgress) {
                    echo "event: progress\n";
                    echo "data: " . json_encode(['progress' => $progress]) . "\n\n";
                    $lastProgress = $progress;
                    $lastChangeTime = time();
                    
                    // Jeśli postęp wynosi 100%, kończymy strumień
                    if ($progress === 100) {
                        break;
                    }
                } else if (time() - $lastChangeTime > $noChangeTimeout) {
                    // Jeśli przez minutę nie było zmiany, kończymy połączenie
                    echo "event: timeout\n";
                    echo "data: " . json_encode(['message' => 'No progress updates for 60 seconds']) . "\n\n";
                    break;
                }
                
                // Wysłanie keep-alive co 30 sekund
                if (time() % 30 === 0) {
                    echo ": keep-alive\n\n";
                }
                
                // Opróżnienie bufora wyjścia
                ob_flush();
                flush();
                
                // Krótsze oczekiwanie dla lepszej responsywności
                usleep(250000); // 0.25 sekundy
                
                // Sprawdzenie czy klient jest nadal połączony
                if (connection_aborted()) {
                    break;
                }
            }
        });
        
        return $response;
    }




    /**
     * Obługuje jednorazowe zapytanie o aktualny stan zadania
     * Zwraca tylko jeden komunikat z aktualnym stanem zadania i natychmiast kończy działanie 
     */
    #[Route(self::GET_COMPRESSION_STATUS_URL . '/{id}', name: 'gtm_compressor_sse_get_compression_status', methods: ['GET'])]
    public function get_sse_compression_status(int $id): Response
    {
        $response = $this->prepareSSEResponse();

        $job = $this->jobRepository->find($id);

        if (!$job) {
            $response->setContent("event: error\ndata: " . json_encode(['error' => 'Zadanie nie istnieje']) . "\n\n");
            return $response;
        }

        // Wysyłamy początkowy stan
        $initialState = [
            'progress' => $job->getProgress(),
            'status' => $job->getStatus(),
            'completed' => $job->getStatus() === 'completed',
        ];

        if ($job->getStatus() === 'completed') {
            $initialState['results'] = $job->getResults();
        } elseif ($job->getStatus() === 'failed') {
            $initialState['error'] = $job->getError();
        }

        $response->setContent("data: " . json_encode($initialState) . "\n\n");

        return $response;
    } 

    // /**
    //  * Nawiązuje długotrwałe połączenie SSE, które monitoruje postęp w czasie rzeczywistym
    //  * Utrzymuje otwarte połączenie i wysyła aktualizacje, gdy stan zadania się zmienia.
    //  * Kończy działanie dopiero po zakończeniu zadania lub przerwaniu połączenia
    //  */
    // #[Route(self::TRACK_COMPRESSION_PROGRESS_URL . '/{id}', name: 'gtm_compressor_sse_compression_tracking', methods: ['GET'])]
    // public function track_see_compression_progress(int $id): Response
    // {
    //     // Przygotowanie odpowiedzi SSE
    //     $response = $this->prepareSSEResponse();

    //     // Pobierz zadanie kompresji
    //     $job = $this->jobRepository->find($id);

    //     // Sprawdź czy zadanie istnieje
    //     if (!$job) {
    //         return $this->createErrorResponse($response, 'Zadanie nie istnieje');
    //     }

    //     // Konfiguracja środowiska dla długotrwałego połączenia
    //     $this->configureEnvironmentForSSE();

    //     // Rozpocznij śledzenie postępu zadania
    //     $this->streamJobProgress($job);

    //     return $response;
    // }

    /** Przygotowuje odpowiedź HTTP z odpowiednimi nagłówkami dla SSE */
    private function prepareSSEResponse(): Response
    {
        $response = new Response();
        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no');

        return $response;
    }

    /** Tworzy odpowiedź z komunikatem błędu */
    private function createErrorResponse(Response $response, string $message): Response
    {
        $response->setContent("event: error_event\ndata: " . json_encode(['message' => $message]) . "\n\n");
        return $response;
    }

    /** Konfiguruje środowisko PHP dla długotrwałego połączenia SSE */
    private function configureEnvironmentForSSE(): void
    {
        // Ustaw timeout skryptu
        set_time_limit(0);
        ignore_user_abort(true);

        // Wyłącz buforowanie PHP
        if (ob_get_level()) {
            ob_end_clean();
        }
        ob_start();
    }

    /** Wysyła zdarzenie SSE do klienta */
    private function sendSSEEvent(array $data, ?string $eventName = null): void
    {
        $output = '';

        if ($eventName) {
            $output .= "event: {$eventName}\n";
        }

        $output .= "data: " . json_encode($data) . "\n\n";
        echo $output;

        ob_flush();
        flush();
    }

    /** Przygotowuje dane o postępie zadania */
    private function prepareProgressData(GTMCompressionJob $job): array
    {
        return [
            'progress' => $job->getProgress(),
            'status' => $job->getStatus(),
            'completed' => $job->getStatus() === 'completed',
        ];
    }

    /** Przygotowuje dane o zakończonym zadaniu */
    private function prepareCompletedData(GTMCompressionJob $job): array
    {
        return [
            'progress' => 100,
            'completed' => true,
            'result' => [
                'compressedImages' => $job->getResults()
            ]
        ];
    }

    /** Przygotowuje dane o błędzie zadania */
    private function prepareErrorData(GTMCompressionJob $job): array
    {
        return [
            'message' => $job->getError() ?: 'Wystąpił nieznany błąd'
        ];
    }

    /** Sprawdza czy zadanie zostało zakończone */
    private function isJobFinished(GTMCompressionJob $job): bool
    {
        return in_array($job->getStatus(), self::END_STATUSES);
    }

    /** Wysyła finalne zdarzenie na podstawie statusu zadania */
    private function sendFinalEvent(GTMCompressionJob $job): void
    {
        if ($job->getStatus() === 'completed') {
            $this->sendSSEEvent($this->prepareCompletedData($job), 'completed');
        } else {
            $this->sendSSEEvent($this->prepareErrorData($job), 'error_event');
        }
    }

    /** Główna pętla śledzenia postępu zadania */
    private function streamJobProgress(GTMCompressionJob $job): void
    {
        $lastProgress = -1;
        $lastStatus = '';

        // Główna pętla śledzenia
        while (!$this->isJobFinished($job) && !connection_aborted()) {
            // Odśwież dane zadania
            $this->refreshJobData($job);

            $this->logger->debug("---------------------------------------------------------------------");
            $this->logger->debug("Czy jest ukończone?: ". $this->isJobFinished($job));
            $this->logger->debug("---------------------------------------------------------------------");

            // Wyślij aktualizację, jeśli dane się zmieniły
            if ($this->hasJobProgressChanged($job, $lastProgress, $lastStatus)) {
                $lastProgress = $job->getProgress();
                $lastStatus = $job->getStatus();

                $this->sendSSEEvent($this->prepareProgressData($job), 'progress');
            }

            // Wyślij finalne zdarzenie, jeśli zadanie zostało zakończone
            if ($this->isJobFinished($job)) {
                $this->sendFinalEvent($job);
                break;
            }

            // Poczekaj przed kolejnym sprawdzeniem
            sleep(1);
        }
    }

    /** Odświeża dane zadania z bazy danych */
    private function refreshJobData(GTMCompressionJob $job): void
    {
        $this->entityManager->refresh($job);
    }

    /** Sprawdza czy postęp zadania się zmienił */
    private function hasJobProgressChanged(GTMCompressionJob $job, int $lastProgress, string $lastStatus): bool
    {
        return $job->getProgress() !== $lastProgress || $job->getStatus() !== $lastStatus;
    }
}





    // /**
    //  * Nawiązuje długotrwałe połączenie SSE, które monitoruje postęp w czasie rzeczywistym
    //  * Utrzymuje otwarte połączenie i wysyła aktualizacje, gdy stan zadania się zmienia.
    //  * Kończy działanie dopiero po zakończeniu zadania lub przerwaniu połączenia
    //  */
    // #[Route('/narzedzia-graficzne/sse/sledzenie-kompresji/{id}', name: 'gtm_compressor_sse_compression_tracking', methods: ['GET'])]
    // public function track_see_compression_progress(int $id): Response
    // {
    //     $response = new Response();
    //     $response->headers->set('Content-Type', 'text/event-stream');
    //     $response->headers->set('Cache-Control', 'no-cache');
    //     $response->headers->set('Connection', 'keep-alive');
    //     $response->headers->set('X-Accel-Buffering', 'no'); // Dla Nginx

    //     // Pobierz początkowy stan zadania
    //     $job = $this->jobRepository->find($id);

    //     if (!$job) {
    //         $response->setContent("event: error_event\ndata: " . json_encode(['message' => 'Zadanie nie istnieje']) . "\n\n");
    //         return $response;
    //     }

    //     // Funkcja do wysyłania danych SSE
    //     $sendEvent = function ($data, $eventName = null) {
    //         $output = '';

    //         if ($eventName) {
    //             $output .= "event: {$eventName}\n";
    //         }

    //         $output .= "data: " . json_encode($data) . "\n\n";
    //         echo $output;

    //         ob_flush();
    //         flush();
    //     };

    //     // Ustaw timeout skryptu
    //     set_time_limit(0);
    //     ignore_user_abort(true);

    //     // Wyłącz buforowanie PHP
    //     ob_end_clean();
    //     ob_start();

    //     // Wysyłaj aktualizacje co 1 sekundę
    //     $lastProgress = -1;
    //     $lastStatus = '';
    //     $endStatuses = ['completed', 'failed'];

    //     while (!in_array($job->getStatus(), $endStatuses) && !connection_aborted()) {
    //         // Odśwież dane zadania
    //         $this->entityManager->refresh($job);

    //         // Jeśli nastąpiła zmiana, wyślij aktualizację
    //         if ($job->getProgress() !== $lastProgress || $job->getStatus() !== $lastStatus) {
    //             $lastProgress = $job->getProgress();
    //             $lastStatus = $job->getStatus();

    //             $data = [
    //                 'progress' => $job->getProgress(),
    //                 'status' => $job->getStatus(),
    //                 'completed' => $job->getStatus() === 'completed',
    //             ];

    //             $sendEvent($data, 'progress');
    //         }

    //         // Jeśli zadanie zostało zakończone, wyślij ostatnie zdarzenie
    //         if (in_array($job->getStatus(), $endStatuses)) {
    //             if ($job->getStatus() === 'completed') {
    //                 $sendEvent([
    //                     'progress' => 100,
    //                     'completed' => true,
    //                     'result' => [
    //                         'compressedImages' => $job->getResults()
    //                     ]
    //                 ], 'completed');
    //             } else {
    //                 $sendEvent([
    //                     'message' => $job->getError() ?: 'Wystąpił nieznany błąd'
    //                 ], 'error_event');
    //             }

    //             break;
    //         }

    //         // Poczekaj 1 sekundę przed kolejnym sprawdzeniem
    //         sleep(1);
    //     }

    //     return $response;
    // }
