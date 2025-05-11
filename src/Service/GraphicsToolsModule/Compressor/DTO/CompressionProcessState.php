<?php

namespace App\Service\GraphicsToolsModule\Compressor\DTO;

use App\Service\GraphicsToolsModule\Editor\DTO\ResizeImageOptions;

class CompressionProcessState
{
    public function __construct(
        public readonly string $processHash,
        public readonly int $ownerId,
        public readonly int $compressionStrength,
        public ?string $imageOriginalName = null,
        public ?string $imagePath = null,
        public ?ResizeImageOptions $resizeOptions = null,
        public ?CompressionResults $compressionResults = null
    ) {
    }
}