<?php

namespace App\Service\GraphicsToolsModule;

use App\Service\GraphicsToolsModule\Contracts\ImagesCompressorInterface; 
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Psr\Log\LoggerInterface;

class ImagesCompressorService implements ImagesCompressorInterface
{
    private string $uploadDir;

    public function __construct(
        private LoggerInterface $logger,
        private UploadImageService $uploadService, 
        private ImageOptimizerService $optimizer, 
        private string $projectDir
    ) {
        $this->uploadDir = "{$this->projectDir}/public/graphics-tools-module/uploads/temp/";
    }

    public function handle(Request $request, string $projectDir): array
    {
        $compressedImages = [];

        foreach ($request->files->all() as $key => $file) {
            if ($file instanceof UploadedFile) {
                $compressedImages[] = $this->compressImage($file);
            }
        }

        return $compressedImages;
    }

    public function compressImage(UploadedFile $image): array
    {
        // Wybierz odpowiedni format w zależności od typu pliku
        $mimeType = $image->getMimeType();
        $originalName = $image->getClientOriginalName();
        $newImageName = $this->uploadService->upload($image, $this->uploadDir, true);

        // Ścieżka do pliku względem katalogu publicznego 
        $originalPath = "{$this->uploadDir}/$newImageName";
        $compressedPath = "graphics-tools-module/uploads/compressed/$newImageName";
        $absoluteCompressedPath = "{$this->projectDir}/public/$compressedPath";
 
        $this->uploadService->ensureDirectoryExists($this->projectDir . '/public/graphics-tools-module/uploads/compressed');
 
        try {
            // Kopiowanie pliku do nowej lokalizacji
            copy($originalPath, $absoluteCompressedPath);
 
            $this->optimizer->optimize($mimeType, $absoluteCompressedPath);
 
            $originalSize = filesize($originalPath); 
            $compressedSize = file_exists($absoluteCompressedPath) ? filesize($absoluteCompressedPath) : 0;

        } catch (\Exception $e) { 
            $this->logger->error($e->getMessage());

            return [
                'originalName' => $originalName,
                'error' => $e->getMessage()
            ];
        }

        return [
            'originalName' => $originalName,
            'originalSize' => $originalSize,
            'compressedSize' => $compressedSize,
            'compressionRatio' => $originalSize > 0 ? round((1 - ($compressedSize / $originalSize)) * 100, 2) : 0,
            'imageDownloadURL' => '/' . $compressedPath,
            'mimeType' => $mimeType
        ];
    } 
}
