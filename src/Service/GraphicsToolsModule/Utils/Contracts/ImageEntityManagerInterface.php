<?php 

namespace App\Service\GraphicsToolsModule\Utils\Contracts;

use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;

interface ImageEntityManagerInterface
{
    public function save(array $imageData, int $userId): void;

    public function saveAsCompressed(CompressionResults $compressionResults, string $operationId, int $userId): void;
}