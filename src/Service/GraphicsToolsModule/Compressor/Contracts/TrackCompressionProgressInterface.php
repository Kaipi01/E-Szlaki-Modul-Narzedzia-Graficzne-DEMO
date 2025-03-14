<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts; 

interface TrackCompressionProgressInterface
{
   public function updateProgress(string $id, int $progress, string $status, string $error = ''): void;
   
    public function getProgress(string $id): ?array;

    public function clearProgress(string $id): void;

    public function cleanupOldProgressFiles(int $maxAgeInSeconds = 3600): int;
}