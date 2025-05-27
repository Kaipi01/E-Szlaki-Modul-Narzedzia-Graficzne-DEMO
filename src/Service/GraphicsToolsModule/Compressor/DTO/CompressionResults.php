<?php

namespace App\Service\GraphicsToolsModule\Compressor\DTO;

use App\Service\GraphicsToolsModule\Workflow\Abstract\AbstractDTO;

class CompressionResults extends AbstractDTO
{
    public function __construct(
        public string $imageName,
        public int $originalSize,
        public int $compressedSize,
        public int|float $compressionRatio,
        public int $compressionStrength,
        public string $downloadURL,
        public string $src,
        public string $mimeType,
        public ?string $originalName = null
    ) {}
}
