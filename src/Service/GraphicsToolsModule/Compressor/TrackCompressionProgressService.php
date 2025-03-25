<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageOperationStatus;
use Psr\Log\LoggerInterface;

class TrackCompressionProgressService implements TrackCompressionProgressInterface
{
    public function __construct(private LoggerInterface $logger, private string $operationProgressDir)
    {
        if (!is_dir($this->operationProgressDir)) {
            mkdir($this->operationProgressDir, 0755, true);
        }
    }

    private function saveProgressFile(string $hash, array $data): void
    {
        file_put_contents("{$this->operationProgressDir}/$hash.json", json_encode($data));
    }

    /** Inicjuj śledzenie postępu */
    public function initTracking(string $hash): void
    {
        $initData = $this->getProgress($hash) ?? [
            'updatedAt' => time(),
            'progress' => 0,
            'status' => ImageOperationStatus::PROCESSING,
            'error' => '',
        ];

        $this->saveProgressFile($hash, $initData); 
    }

    /** Aktualizuje postęp kompresji w pliku */
    public function updateProgress(string $hash, int $progress, string $status = ImageOperationStatus::PROCESSING, string $error = ''): void
    { 
        $this->saveProgressFile($hash, [
            'updatedAt' => time(),
            'progress' => $progress,
            'status' => $status,
            'error' => $error,
        ]); 
    }

    /** Pobiera aktualny postęp kompresji dla danego obrazu */
    public function getProgress(string $hash): ?array
    {
        $progressFile = "{$this->operationProgressDir}/$hash.json";

        $this->logger->debug("-----------------------------------------------------------------");
        $this->logger->debug("Pobranie danych dla '$progressFile'");

        if (!file_exists($progressFile)) {
            $this->logger->error("Plik nie istnieje!!!");

            return null;
        }

        $fileContent = file_get_contents($progressFile);
        
        if ($fileContent === false) {
            $this->logger->error("Błąd odczytu pliku");

            return null;
        }

        $data = json_decode($fileContent, true);

        if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
            $this->logger->error("Błąd parsowania JSON");

            return null;
        }

        $this->logger->debug("-----------------------------------------------------------------");

        return $data;
    }

    /** Usuwa informacje o postępie */
    public function clearProgress(string $hash): void
    {
        $progressFile = "{$this->operationProgressDir}/$hash.json";

        if (file_exists($progressFile)) {
            unlink($progressFile);
        }
    }

    /** Czyści stare pliki postępu */
    public function cleanupOldProgressFiles(int $maxAgeInSeconds = 3600): int
    {
        $files = glob("{$this->operationProgressDir}/*.json");
        $now = time();
        $count = 0;

        foreach ($files as $file) {
            if (is_file($file) && ($now - filemtime($file) > $maxAgeInSeconds)) {
                if (unlink($file)) {
                    $count++;
                }
            }
        }

        return $count;
    }

    /** Wyświetl aktulany postęp w konsoli */
    public function showProgressLog(string $processHash): void
    {
        $this->logger->debug('---------------------------------------------------------------------------------');

        $progressData = $this->getProgress($processHash);
 
        if ($progressData === null) {
            $this->logger->debug('Aktualny postęp. Brak danych!');
        } else {
            $progressValue = $progressData['progress'];
            $progressStatus = $progressData['status'];
            
            $this->logger->debug('Aktualny postęp', [
                'processHash' => $processHash,
                'progress' => $progressValue,
                'status' => $progressStatus
            ]);
        } 

        $this->logger->debug('---------------------------------------------------------------------------------');
    }
}
