<?php

namespace App\Service\GraphicsToolsModule\Compressor\DTO;

use InvalidArgumentException;

class CompressionResults
{
    public function __construct(
        public string $originalName,
        public int $originalSize,
        public int $compressedSize,
        public int $compressionRatio,
        public string $downloadURL,
        public string $mimeType,
    ) {}

    public static function fromArray(array $data): self
    {
        self::validateArray($data);

        return new self(
            originalName: $data['originalName'] ?? '',
            originalSize: (int)($data['originalSize'] ?? 0),
            compressedSize: (int)($data['compressedSize'] ?? 0),
            compressionRatio: (float)($data['compressionRatio'] ?? 0),
            downloadURL: $data['downloadURL'] ?? '',
            mimeType: $data['mimeType'] ?? ''
        );
    }

    public function toArray(): array
    {
        return [
            'originalName' => $this->originalName,
            'originalSize' => $this->originalSize,
            'compressedSize' => $this->compressedSize,
            'compressionRatio' => $this->compressionRatio,
            'downloadURL' => $this->downloadURL,
            'mimeType' => $this->mimeType
        ];
    }

    /** 
     * @param array $data
     * @throws \InvalidArgumentException
     * @return void
     */
    private static function validateArray(array $data): void
    { 
        $requiredFields = ['originalName', 'originalSize', 'compressedSize', 'compressionRatio', 'downloadURL', 'mimeType'];

        foreach ($requiredFields as $field) {
            if (!array_key_exists($field, $data)) {
                throw new InvalidArgumentException("Brakujące pole: {$field}");
            }
        }
 
        if (!is_string($data['originalName']) || empty(trim($data['originalName']))) {
            throw new InvalidArgumentException("Pole 'originalName' musi być niepustym ciągiem znaków");
        }

        if (!is_numeric($data['originalSize']) || $data['originalSize'] < 0) {
            throw new InvalidArgumentException("Pole 'originalSize' musi być liczbą nieujemną");
        }

        if (!is_numeric($data['compressedSize']) || $data['compressedSize'] < 0) {
            throw new InvalidArgumentException("Pole 'compressedSize' musi być liczbą nieujemną");
        }

        if (!is_numeric($data['compressionRatio']) || $data['compressionRatio'] < 0 || $data['compressionRatio'] > 100) {
            throw new InvalidArgumentException("Pole 'compressionRatio' musi być liczbą z zakresu 0-100");
        }

        if (!is_string($data['downloadURL']) || empty(trim($data['downloadURL']))) {
            throw new InvalidArgumentException("Pole 'downloadURL' musi być niepustym ciągiem znaków");
        }

        if (!is_string($data['mimeType']) || empty(trim($data['mimeType']))) {
            throw new InvalidArgumentException("Pole 'mimeType' musi być niepustym ciągiem znaków");
        } 
    }
}
