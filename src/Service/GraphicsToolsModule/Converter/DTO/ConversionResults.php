<?php 

namespace App\Service\GraphicsToolsModule\Converter\DTO;

class ConversionResults
{ 
    public function __construct(
        public string $originalName,
        public int $originalSize,
        public int $originalFormat,
        public int $conversionSize,
        public int $conversionFormat,
        public int|float $conversionRatio,
        public string $downloadURL,
        public string $src,
        public string $mimeType
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
            src: $data['src'] ?? '',
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
            'src' => $this->src,
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
        $requiredFields = ['originalName', 'originalSize', 'compressedSize', 'compressionRatio', 'downloadURL', 'src', 'mimeType'];

        foreach ($requiredFields as $field) {
            if (!array_key_exists($field, $data)) {
                throw new InvalidArgumentException("Brakujące pole: {$field}");
            }
        }

        $isPropValueEmpty = function (string $name) use ($data) {
            if (!is_string($data[$name]) || empty(trim($data[$name]))) {
                throw new InvalidArgumentException("Pole '$name' musi być niepustym ciągiem znaków");
            }
        };
        $isNonNegativeNumber = function (string $name) use ($data) {
            if (!is_numeric($data[$name]) || $data[$name] < 0) {
                throw new InvalidArgumentException("Pole '$name' musi być liczbą nieujemną");
            }
        };

        if (!is_numeric($data['compressionRatio']) || $data['compressionRatio'] < 0 || $data['compressionRatio'] > 100) {
            throw new InvalidArgumentException("Pole 'compressionRatio' musi być liczbą z zakresu 0-100");
        }

        $isNonNegativeNumber('originalSize');
        $isNonNegativeNumber('compressedSize');
        $isPropValueEmpty('mimeType');
        $isPropValueEmpty('downloadURL');
        $isPropValueEmpty('src');
        $isPropValueEmpty('originalName');
    } 

}