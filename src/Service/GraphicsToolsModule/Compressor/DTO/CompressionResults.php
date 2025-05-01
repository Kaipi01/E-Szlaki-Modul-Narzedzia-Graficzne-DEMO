<?php

namespace App\Service\GraphicsToolsModule\Compressor\DTO;

use App\Service\GraphicsToolsModule\Workflow\Abstract\OperationResults;

class CompressionResults extends OperationResults
{
    public function __construct(
        public string $imageName,
        public int $originalSize,
        public int $compressedSize,
        public int|float $compressionRatio,
        public string $downloadURL,
        public string $src,
        public string $mimeType,
        public ?string $originalName = null
    ) {}

    // public static function fromArray(array $data): self
    // {
    //     self::validateArray($data);

    //     return new self(
    //         imageName: $data['imageName'],
    //         originalSize: (int)($data['originalSize'] ?? 0),
    //         compressedSize: (int)($data['compressedSize'] ?? 0),
    //         compressionRatio: (float)($data['compressionRatio'] ?? 0),
    //         downloadURL: $data['downloadURL'],
    //         src: $data['src'],
    //         mimeType: $data['mimeType'] 
    //     );
    // }

    // public function toArray(): array
    // {
    //     return [
    //         'imageName' => $this->imageName,
    //         'originalSize' => $this->originalSize,
    //         'compressedSize' => $this->compressedSize,
    //         'compressionRatio' => $this->compressionRatio,
    //         'downloadURL' => $this->downloadURL,
    //         'src' => $this->src,
    //         'mimeType' => $this->mimeType
    //     ];
    // } 
}
