<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts;

use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;

interface ImageEntityManagerInterface
{
    public function save(array $imageData): void;

    public function saveAsCompressed(CompressionResults $compressionResults, string $operationId): void;
}