<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageOperationStatus;

class TrackCompressionProgressService implements TrackCompressionProgressInterface
{
    private string $progressDir;

    public function __construct(private string $projectDir)
    {
        $this->progressDir = "{$this->projectDir}/var/compression-progress/";

        if (!is_dir($this->progressDir)) {
            mkdir($this->progressDir, 0755, true);
        }
    }

    /** Aktualizuje postęp kompresji w pliku */
    public function updateProgress(string $id, int $progress, string $status = ImageOperationStatus::PROCESSING, string $error = ''): void
    {
        $progressData = [
            'updatedAt' => time(),
            'progress' => $progress,
            'status' => $status,
            'error' => $error,
        ];

        file_put_contents(
            "{$this->progressDir}{$id}.json",
            json_encode($progressData, JSON_PRETTY_PRINT)
        );
    }

    /** Pobiera aktualny postęp kompresji dla danego obrazu */
    public function getProgress(string $imageId): ?array
    {
        $progressFile = "{$this->progressDir}{$imageId}.json";

        if (!file_exists($progressFile)) {
            return null;
        }

        $fileContent = file_get_contents($progressFile);
        if ($fileContent === false) {
            return null;
        }

        $data = json_decode($fileContent, true);

        if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        return $data;
    }

    /** Usuwa informacje o postępie */
    public function clearProgress(string $imageId): void
    {
        $progressFile = "{$this->progressDir}{$imageId}.json";

        if (file_exists($progressFile)) {
            unlink($progressFile);
        }
    }

    /** Czyści stare pliki postępu */
    public function cleanupOldProgressFiles(int $maxAgeInSeconds = 3600): int
    {
        $files = glob("{$this->progressDir}*.json");
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
}
