<?php

namespace App\Service\GraphicsToolsModule\Converter\DTO;

use App\Service\GraphicsToolsModule\Workflow\Abstract\OperationResults; 

class ConversionResults extends OperationResults
{
    public function __construct(
        public string $imageName,
        public string $newName,
        public int $originalSize,
        public string $originalFormat,
        public int $conversionSize,
        public string $conversionFormat,
        public float|int $conversionQuality,
        public string $downloadURL,
        public string $src,
        public string $absoluteSrc,
        public string $mimeType,
        public ?string $originalName = null
    ) {}
}
