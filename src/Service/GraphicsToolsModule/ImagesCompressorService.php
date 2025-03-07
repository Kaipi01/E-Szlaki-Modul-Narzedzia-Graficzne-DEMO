<?php

namespace App\Service\graphics-tools-module;

use App\Service\graphics-tools-module\Contracts\ImagesCompressorInterface;
use Symfony\Component\HttpFoundation\Request;
use Liip\ImagineBundle\Imagine\Cache\CacheManager; 
use Symfony\Component\HttpFoundation\File\UploadedFile;


class ImagesCompressorService implements ImagesCompressorInterface
{
    private string $uploadDir;

    public function __construct(private CacheManager $cacheManager, private UploadImageService $uploadService, private string $projectDir)
    {
        $this->uploadDir = $this->projectDir . '/public/graphics-tools-module/uploads/temp/';
    }

    public function compressImage(UploadedFile $image): array
    {  
        // Wybierz odpowiedni filtr w zależności od typu pliku
        $mimeType = $image->getMimeType();
        $originalName = $image->getClientOriginalName();
        $filterName = $this->getFilterNameForMimeType($mimeType);

        $newImageName = $this->uploadService->upload($image, $this->uploadDir);
        // Ścieżka do pliku względem katalogu publicznego
        $relativePath = 'graphics-tools-module/uploads/temp/' . $newImageName;

        // Zastosuj filtr kompresji
        $compressedPath = $this->cacheManager->getBrowserPath($relativePath, $filterName);

        // Pobierz rozmiar oryginalnego pliku
        $originalSize = filesize($this->uploadDir . $newImageName);

        // Pobierz rozmiar skompresowanego pliku
        $compressedFilePath = $this->projectDir . '/public/graphics-tools-module/media/cache/' . $filterName . '/' . $relativePath;
        $compressedSize = file_exists($compressedFilePath) ? filesize($compressedFilePath) : 0;

        return [
            'originalName' => $originalName,
            'originalSize' => $originalSize,
            'compressedSize' => $compressedSize,
            'compressionRatio' => $originalSize > 0 ? round((1 - ($compressedSize / $originalSize)) * 100, 2) : 0,
            'imageDownloadURL' => $compressedPath,
            'mimeType' => $mimeType
        ];
    }

    public function handle(Request $request, string $projectDir): array
    {
        // Tablica na wyniki kompresji
        $compressedImages = [];

        foreach ($request->files->all() as $key => $file) {
            if ($file instanceof UploadedFile) {
                // Dodaj informacje o skompresowanym obrazie do wyników
                $compressedImages[] = $this->compressImage($file);
            }
        }

        return $compressedImages;
    }

    /**
     * Wybiera odpowiedni filtr na podstawie typu MIME
     */
    private function getFilterNameForMimeType(string $mimeType): string
    {
        switch ($mimeType) {
            case 'image/jpeg':
            case 'image/jpg':
                return 'jpeg_optimized';
            case 'image/png':
                return 'png_optimized';
            case 'image/webp':
                return 'webp_conversion';
            default:
                return 'jpeg_optimized';
        }
    }
}
