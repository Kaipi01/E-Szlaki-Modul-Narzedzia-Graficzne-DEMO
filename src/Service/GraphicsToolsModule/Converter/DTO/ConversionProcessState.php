<?php

namespace App\Service\GraphicsToolsModule\Converter\DTO;

class ConversionProcessState
{
    public function __construct(
        public readonly string $processHash,
        public readonly int $ownerId,
        public readonly string $toFormat,
        public int $quality,
        public bool $addCompress, 
        public ?string $imageOriginalName = null,
        public ?string $imagePath = null,
        public ?ConversionResults $conversionResults = null
    ) {
    }
}