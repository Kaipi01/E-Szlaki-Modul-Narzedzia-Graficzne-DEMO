<?php 

namespace App\Service\GraphicsToolsModule\Contracts;

interface TrackCompressionProgressInterface
{
   public function updateProgress(string $imageId, int $progress): void;
   
    public function getProgress(string $imageId): int;

    public function clearProgress(string $imageId): void;
}