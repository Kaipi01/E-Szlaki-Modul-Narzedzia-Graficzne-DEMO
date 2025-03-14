<?php

namespace App\Controller;

use App\Entity\GTMImage;
use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
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
    public function track_compression_progress(string $processId): Response
    {
        // Zamknij sesję przed rozpoczęciem strumienia
        // if (session_status() === PHP_SESSION_ACTIVE) {
        //     session_write_close();
        // }
        $response = new Response();

        $this->logger->debug('Rozpoczęcie połączenia SSE');

        try { 

            $response = new StreamedResponse(function () use ($processId) {
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

                    $progressData = $this->compressionTracker->getProgress($processId);
                    $progressValue = $progressData['progress'];

                    // $this->logger->debug($progressValue);

                    if ($progressValue !== $lastProgress) {
                        echo "event: progress\n";
                        echo "data: " . json_encode(['progress' => $progressValue]) . "\n\n";
                        $lastProgress = $progressValue;
                        $lastChangeTime = time();

                        // Jeśli postęp wynosi 100%, kończymy strumień
                        if ($progressValue === 100) {
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
        } catch (\Exception $e) {
            dump($e->getMessage());
            $this->logger->error($e->getMessage());
        }

        return $response;
    }
} 






// 

//     /**
//      * Obługuje jednorazowe zapytanie o aktualny stan zadania
//      * Zwraca tylko jeden komunikat z aktualnym stanem zadania i natychmiast kończy działanie 
//      */
//     #[Route(self::GET_COMPRESSION_STATUS_URL . '/{id}', name: 'gtm_compressor_sse_get_compression_status', methods: ['GET'])]
//     public function get_sse_compression_status(int $id): Response
//     {
//         $response = $this->prepareSSEResponse();

//         $job = $this->jobRepository->find($id);

//         if (!$job) {
//             $response->setContent("event: error\ndata: " . json_encode(['error' => 'Zadanie nie istnieje']) . "\n\n");
//             return $response;
//         }

//         // Wysyłamy początkowy stan
//         $initialState = [
//             'progress' => $job->getProgress(),
//             'status' => $job->getStatus(),
//             'completed' => $job->getStatus() === 'completed',
//         ];

//         if ($job->getStatus() === 'completed') {
//             $initialState['results'] = $job->getResults();
//         } elseif ($job->getStatus() === 'failed') {
//             $initialState['error'] = $job->getError();
//         }

//         $response->setContent("data: " . json_encode($initialState) . "\n\n");

//         return $response;
//     }  

//     /** Przygotowuje odpowiedź HTTP z odpowiednimi nagłówkami dla SSE */
//     private function prepareSSEResponse(): Response
//     {
//         $response = new Response();
//         $response->headers->set('Content-Type', 'text/event-stream');
//         $response->headers->set('Cache-Control', 'no-cache');
//         $response->headers->set('Connection', 'keep-alive');
//         $response->headers->set('X-Accel-Buffering', 'no');

//         return $response;
//     } 