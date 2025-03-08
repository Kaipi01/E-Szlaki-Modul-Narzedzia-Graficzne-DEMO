<?php

namespace App\Service\GraphicsToolsModule;

use App\Service\GraphicsToolsModule\Contracts\UploadImageServiceInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class UploadImageService implements UploadImageServiceInterface
{
    public function __construct(private LoggerInterface $logger) {}

    public function upload(UploadedFile $image, string $uploadDir, bool $keepOriginalName = false): ?string
    {
        $newFilename = $this->getSaveImageName($image, $keepOriginalName);

        $this->ensureDirectoryExists($uploadDir);

        try {
            $image->move($uploadDir, $newFilename);
            return $newFilename;
        } catch (\Exception $e) {
            $this->logger->error($e->getMessage());
            throw new \Exception('Nie udalo sie wyslac pliku.');
        }
    }

    public function getSaveImageName(UploadedFile $image, bool $keepOriginalName = false): string
    {
        $originalFilename = pathinfo($image->getClientOriginalName(), PATHINFO_FILENAME);
        $safeFilename = transliterator_transliterate('Any-Latin; Latin-ASCII; [^A-Za-z0-9_] remove; Lower()', $originalFilename);
        $newFilename = $keepOriginalName ? $safeFilename : $safeFilename . '-' . uniqid();
        $newFilename .= '.' . $image->guessExtension();

        return $newFilename;
    }

    public function ensureDirectoryExists(string $directory): void
    {
        if (!is_dir($directory)) {
            mkdir($directory, 0777, true);
        }
    }
}
