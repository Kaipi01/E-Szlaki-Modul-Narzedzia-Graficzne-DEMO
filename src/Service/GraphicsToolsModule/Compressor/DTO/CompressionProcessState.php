<?php

namespace App\Service\GraphicsToolsModule\Compressor\DTO; 

class CompressionProcessState
{
    public function __construct(
        public readonly string $processHash,
        public readonly int $ownerId,
        public readonly string $processDir,
        public ?string $imagePath = null,
        public ?string $imageMimeType = null,
        public ?string $imageOriginalName = null,
        public ?string $destinationPath = null,
        public ?CompressionResults $compressionResults = null,
    ) {
    }
}