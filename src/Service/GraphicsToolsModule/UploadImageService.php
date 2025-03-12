<?php

namespace App\Service\GraphicsToolsModule;

use App\Service\GraphicsToolsModule\Contracts\UploadImageServiceInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;

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

    public function uploadAllFromRequest(Request $request, string $uploadDir, bool $keepOriginalName = false): array
    {
        $fileInfos = [];

        foreach ($request->files->all() as $key => $file) {
            if ($file instanceof UploadedFile) {
                $originalName = $file->getClientOriginalName();
                $mimeType = $file->getMimeType();
                $size = $file->getSize();
                $newImageName = $this->upload($file, $uploadDir, $keepOriginalName);
                
                $fileInfos[] = [
                    'originalName' => $originalName,
                    'savedName' => $newImageName,
                    'mimeType' => $mimeType,
                    'size' => $size,
                    'tempPath' => "{$uploadDir}/$newImageName"
                ];
            }
        }

        return $fileInfos;
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
