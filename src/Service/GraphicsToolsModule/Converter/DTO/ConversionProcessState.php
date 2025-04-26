<?php

namespace App\Service\GraphicsToolsModule\Converter\DTO;

class ConversionProcessState
{
    public function __construct(
        public readonly string $processHash,
        public readonly int $ownerId,
        public readonly string $processDir,
        public readonly string $toFormat,
        public ?string $imagePath = null,
        public ?string $imageMimeType = null,
        public ?string $imageOriginalName = null,
        public ?string $destinationPath = null,
        public ?ConversionResults $conversioResults = null,
    ) {
    }
}