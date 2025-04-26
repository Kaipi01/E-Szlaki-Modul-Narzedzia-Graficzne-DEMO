<?php  

namespace App\Service\GraphicsToolsModule\Workflow\DTO;

use InvalidArgumentException;

class ImageProcessData
{
    public function __construct(public string $status, public int $progress, public string $processHash) {}

    public static function fromArray(array $data): self
    {
        self::validateArray($data);

        return new self(
            status: $data['status'] ?? '',
            progress: (int)($data['progress'] ?? 0),
            processHash: $data['processHash'] ?? ''
        );
    }

    public function toArray(): array
    {
        return [
            'status' => $this->status,
            'progress' => $this->progress,
            'processHash' => $this->processHash
        ];
    }

    /** 
     * @param array $data
     * @throws \InvalidArgumentException
     * @return void
     */
    private static function validateArray(array $data): void
    {
        $requiredFields = ['status', 'progress', 'processHash'];

        foreach ($requiredFields as $field) {
            if (!array_key_exists($field, $data)) {
                throw new InvalidArgumentException("Brakujące pole: {$field}");
            }
        }
 
        if (!is_string($data['status']) || empty(trim($data['status']))) {
            throw new InvalidArgumentException("Pole 'status' musi być niepustym ciągiem znaków");
        }
 
        if (!is_numeric($data['progress']) || $data['progress'] < 0 || $data['progress'] > 100) {
            throw new InvalidArgumentException("Pole 'progress' musi być liczbą z zakresu 0-100");
        }
 
        if (!is_string($data['processHash'])) {
            throw new InvalidArgumentException("Pole 'processHash' musi być ciągiem znaków");
        }
    }
}
