<?php

namespace App\Service\GraphicsToolsModule\Utils;

use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageFileValidatorInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\UploadImageServiceInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class UploadImageService implements UploadImageServiceInterface
{
    public function __construct(private GTMLoggerInterface $logger, private ImageFileValidatorInterface $imageFileValidator)
    {
    }

    public function upload(UploadedFile $image, string $uploadDir, bool $keepOriginalName = false, bool $setUniqueName = false): array
    {
        if (!$image || !$image instanceof UploadedFile) {
            throw new \InvalidArgumentException("Nie przesłano pliku!");
        }
        if (!$image->isValid()) {
            throw new \Exception("Przesłany plik jest nieprawidłowy. Kod błędu: {$image->getError()}");
        }
        $this->ensureDirectoryExists($uploadDir);
        $this->imageFileValidator->validate($image);

        $originalName = $image->getClientOriginalName();
        $newImageName = $this->getSaveImageName($originalName, $keepOriginalName, $setUniqueName);
        $mimeType = $image->getMimeType();
        $size = $image->getSize();

        try {
            $image->move($uploadDir, $newImageName);

            return [
                'originalName' => $originalName,
                'thumbnailName' => "thumbnail-$originalName",
                'newName' => $newImageName,
                'mimeType' => $mimeType,
                'size' => $size,
                'path' => "{$uploadDir}/{$newImageName}"
            ];

        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas przesyłania pliku', [
                'error' => $e->getMessage(),
                'originalName' => $originalName
            ]);
            throw new \Exception('Nie udało się wysłać pliku.');
        }
    } 

    public function ensureDirectoryExists(string $directory): void
    {
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
    }

    public function getSaveImageName(string $originalName, bool $keepOriginalName = false, bool $setUniqueName = false): string
    {
        $originalFilename = pathinfo($originalName, PATHINFO_FILENAME);
        $fileExtension = pathinfo($originalName, PATHINFO_EXTENSION);

        if ($setUniqueName) {
            return $this->generateUniqueName() . ".{$fileExtension}";
        }
        
        $safeFilename = transliterator_transliterate('Any-Latin; Latin-ASCII; [^A-Za-z0-9_] remove; Lower()', $originalFilename);
        $newFilename = $keepOriginalName ? $safeFilename : $safeFilename . '-' . uniqid();
        $newFilename .= ".{$fileExtension}";

        return $newFilename;
    }

    /**
     * Generuje bezpieczną nazwę pliku na podstawie oryginalnej nazwy 
     * @return string Bezpieczna nazwa pliku
     */
    public function generateUniqueName(): string
    {
        $timestamp = time();
        $random = substr(bin2hex(random_bytes(5)), 0, 10); // 10 znaków hex = 5 bajtów

        return "{$timestamp}{$random}";
    }
}
