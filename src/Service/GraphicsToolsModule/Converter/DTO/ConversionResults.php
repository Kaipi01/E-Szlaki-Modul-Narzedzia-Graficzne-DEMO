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

    // public static function fromArray(array $data): self
    // {
    //     self::validateArray($data);

    //     return new self(
    //         imageName:       (string) $data['imageName'],            
    //         newName:         (string) $data['newName'],            
    //         originalSize:    (int)    $data['originalSize'],
    //         originalFormat:  (int)    $data['originalFormat'],
    //         conversionSize:  (int)    $data['conversionSize'],
    //         conversionFormat:(int)    $data['conversionFormat'],
    //         conversionQuality:        $data['conversionQuality'] + 0,
    //         downloadURL:     (string) $data['downloadURL'],
    //         src:             (string) $data['src'],
    //         absoluteSrc:     (string) $data['absoluteSrc'],
    //         mimeType:        (string) $data['mimeType']
    //     );
    // }

    // public function toArray(): array
    // {
    //     return [
    //         'imageName'      => $this->imageName,
    //         'newName'           => $this->newName,
    //         'originalSize'      => $this->originalSize,
    //         'originalFormat'    => $this->originalFormat,
    //         'conversionSize'    => $this->conversionSize,
    //         'conversionFormat'  => $this->conversionFormat,
    //         'conversionQuality' => $this->conversionQuality,
    //         'downloadURL'       => $this->downloadURL,
    //         'src'               => $this->src,
    //         'absoluteSrc'       => $this->absoluteSrc,
    //         'mimeType'          => $this->mimeType,
    //     ];
    // }

    // /**
    //  * @param array $data
    //  * @throws InvalidArgumentException
    //  */
    // private static function validateArray(array $data): void
    // {
    //     $requiredFields = [
    //         'imageName',
    //         'newName',
    //         'originalSize',
    //         'originalFormat',
    //         'conversionSize',
    //         'conversionFormat',
    //         'conversionQuality',
    //         'downloadURL',
    //         'src',
    //         'absoluteSrc',
    //         'mimeType',
    //     ];

    //     foreach ($requiredFields as $field) {
    //         if (!array_key_exists($field, $data)) {
    //             throw new InvalidArgumentException("Missing field: {$field}");
    //         }
    //     }

    //     foreach (['imageName', 'downloadURL', 'src', 'mimeType'] as $field) {
    //         if (!is_string($data[$field]) || trim($data[$field]) === '') {
    //             throw new InvalidArgumentException("Field '{$field}' must be a non-empty string");
    //         }
    //     }

    //     foreach (['originalSize', 'conversionSize'] as $field) {
    //         if (!is_numeric($data[$field]) || $data[$field] < 0) {
    //             throw new InvalidArgumentException("Field '{$field}' must be a non-negative number");
    //         }
    //     }

    //     if (!is_numeric($data['conversionQuality']) || $data['conversionQuality'] < 0) {
    //         throw new InvalidArgumentException("Field 'conversionQuality' must be a non-negative number");
    //     }
    // }
}
