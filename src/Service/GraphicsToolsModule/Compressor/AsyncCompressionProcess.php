<?php

namespace App\Service\GraphicsToolsModule\Compressor;
 
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;
use App\Service\GraphicsToolsModule\Compressor\ImageEntityManager;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageOperationStatus;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use React\EventLoop\Loop;

class AsyncCompressionProcess
{ 
    public function __construct(
        private CompressorInterface $compressor,
        private TrackCompressionProgressInterface $compressionTracker,
        private LoggerInterface $logger,
        private ImageEntityManager $imageManager,
        private EntityManagerInterface $entityManager,
        private ParameterBagInterface $params
    ) { }

    /** Rozpoczyna asynchroniczny proces kompresji obrazu */
    public function start(string $processHash, int $userId, string $imagePath, string $originalName, string $mimeType): void
    {   
        // Inicjalizacja śledzenia postępu
        $this->compressionTracker->updateProgress($processHash, 0, ImageOperationStatus::PENDING);
        
        $this->logger->debug('Rozpoczęcie asynchronicznej kompresji obrazu', [
            'processHash' => $processHash,
            'userId' => $userId,
            'originalName' => $originalName
        ]);  

        // Krok 1: Przygotowanie katalogów (po 50.5s)
        Loop::addTimer(0.5, function () use ($processHash, $userId, $imagePath, $originalName, $mimeType) {
            try {
                // Aktualizacja postępu
                $this->compressionTracker->updateProgress($processHash, 25, ImageOperationStatus::PENDING);
                $this->compressionTracker->showProgressLog($processHash);
                
                // Przygotowanie katalogu docelowego
                $compressedDir = $this->params->get('gtm_uploads_compressed');
                $destinationDir = "{$compressedDir}/{$userId}";
                if (!is_dir($destinationDir)) {
                    mkdir($destinationDir, 0755, true);
                }
                
                // Przejście do kroku 2
                $this->step2_prepareImage($processHash, $userId, $imagePath, $originalName, $mimeType, $destinationDir);
            } catch (\Exception $e) {
                $this->handleError($processHash, $e);
            }
        });
    }
    
    /** Krok 2: Przygotowanie obrazu */
    private function step2_prepareImage(string $processHash, int $userId, string $imagePath, string $originalName, string $mimeType, string $destinationDir): void
    {
        // Dodanie opóźnienia dla symulacji pracy (1s)
        Loop::addTimer(1, function () use ($processHash, $userId, $imagePath, $originalName, $mimeType, $destinationDir) {
            try {
                // Aktualizacja postępu
                $this->compressionTracker->updateProgress($processHash, 40, ImageOperationStatus::PREPARING);
                $this->compressionTracker->showProgressLog($processHash);
                
                // Kopiowanie pliku do katalogu docelowego
                $destinationPath = $destinationDir . "/" . basename($originalName);
                copy($imagePath, $destinationPath);
                
                // Opcjonalnie - usunięcie pliku tymczasowego
                if (file_exists($imagePath)) {
                    unlink($imagePath);
                }
                
                // Przejście do kroku 3
                $this->step3_compressImage($processHash, $userId, $destinationPath, $originalName, $mimeType);
            } catch (\Exception $e) {
                $this->handleError($processHash, $e);
            }
        });
    }
    
    /** Krok 3: Kompresja obrazu */
    private function step3_compressImage(string $processHash, int $userId, string $imagePath, string $originalName, string $mimeType): void
    {
        // Dodanie opóźnienia dla symulacji pracy (1s)
        Loop::addTimer(1, function () use ($processHash, $userId, $imagePath, $originalName, $mimeType) {
            try {
                // Aktualizacja postępu
                $this->compressionTracker->updateProgress($processHash, 80, ImageOperationStatus::PROCESSING);
                $this->compressionTracker->showProgressLog($processHash);
                
                // Wykonanie faktycznej kompresji - to może być operacja blokująca!
                $compressionResults = $this->compressor->compress($imagePath, $mimeType);
                
                // Przejście do kroku 4
                $this->step4_saveResults($processHash, $userId, $compressionResults);
            } catch (\Exception $e) {
                $this->handleError($processHash, $e);
            }
        });
    }
    
    /** Krok 4: Zapisanie wyników */
    private function step4_saveResults(string $processHash, int $userId, CompressionResults $compressionResults): void
    {
        // Dodanie opóźnienia dla symulacji pracy (1s)
        Loop::addTimer(1, function () use ($processHash, $userId, $compressionResults) {
            try {
                // Aktualizacja postępu
                $this->compressionTracker->updateProgress($processHash, 90, ImageOperationStatus::PROCESSING);
                $this->compressionTracker->showProgressLog($processHash);
                
                // Zapisanie wyników w bazie danych
                $this->imageManager->saveAsCompressed($compressionResults, $processHash, $userId);
                
                // Zakończenie procesu
                $this->compressionTracker->updateProgress($processHash, 100, ImageOperationStatus::COMPLETED);
                $this->compressionTracker->showProgressLog($processHash);
                
                $this->logger->debug('Kompresja zakończona pomyślnie', [
                    'processHash' => $processHash
                ]);
                
                // Nie zatrzymujemy już pętli zdarzeń - pozwalamy jej działać
            } catch (\Exception $e) {
                $this->handleError($processHash, $e);
            }
        });
    }
    
    /**
     * Obsługa błędów podczas przetwarzania
     */
    private function handleError(string $processHash, \Exception $e): void
    {
        $this->logger->error('Błąd podczas asynchronicznej kompresji obrazu', [
            'processHash' => $processHash,
            'error' => $e->getMessage()
        ]);
        
        $this->compressionTracker->updateProgress($processHash, 0, ImageOperationStatus::FAILED, $e->getMessage());
         
    }
}
