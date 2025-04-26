<?php

namespace App\Service\GraphicsToolsModule\Utils;

use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageFileValidatorInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\UploadImageServiceInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;

class UploadImageService implements UploadImageServiceInterface
{
    public function __construct(private GTMLoggerInterface $logger, private ImageFileValidatorInterface $imageFileValidator) {}

    public function upload(UploadedFile $image, string $uploadDir, bool $keepOriginalName = false): ?string
    {
        if (!$image->isValid()) {
            throw new \Exception("Przesłany plik jest nieprawidłowy. Kod błędu: {$image->getError()}");
        }
        $this->imageFileValidator->validate($image);

        $newFilename = $this->imageFileValidator->getSaveImageName($image->getClientOriginalName(), $keepOriginalName);

        $this->ensureDirectoryExists($uploadDir);

        try {
            $image->move($uploadDir, $newFilename);

            return $newFilename;
        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas przesyłania pliku', [
                'error' => $e->getMessage(),
                'originalName' => $image->getClientOriginalName()
            ]);
            throw new \Exception('Nie udało się wysłać pliku.');
        }
    }

    public function uploadAllFromRequest(Request $request, string $uploadDir, bool $keepOriginalName = false): array
    {
        $fileInfos = [];

        foreach ($request->files->all() as $key => $file) {
            if ($file instanceof UploadedFile && $file->isValid()) {
                $originalName = $file->getClientOriginalName();
                $mimeType = $file->getMimeType();
                $size = $file->getSize();
                $newImageName = $this->upload($file, $uploadDir, $keepOriginalName);

                $fileInfos[] = [
                    'originalName' => $originalName,
                    'savedName' => $newImageName,
                    'mimeType' => $mimeType,
                    'size' => $size,
                    'tempPath' => "{$uploadDir}/{$newImageName}"
                ];
            }
        }

        return $fileInfos;
    } 

    public function ensureDirectoryExists(string $directory): void
    {
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
    }
}
