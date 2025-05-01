<?php

namespace App\Service\GraphicsToolsModule\Compressor\DTO; 

class CompressionProcessState
{
    public function __construct(
        public readonly string $processHash,
        public readonly int $ownerId,
        public ?string $imageOriginalName = null,
        public ?string $imagePath = null,
        public ?CompressionResults $compressionResults = null
    ) {
    }
}