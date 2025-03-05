<?php

namespace App\Service\GraphicsToolsModule;

use App\Service\GraphicsToolsModule\Contracts\ImagesCompressorInterface;
use Symfony\Component\HttpFoundation\Request; 
use Liip\ImagineBundle\Imagine\Cache\CacheManager; 
use Symfony\Component\HttpFoundation\File\UploadedFile;


class ImagesCompressorService implements ImagesCompressorInterface
{
    public function __construct(private CacheManager $cacheManager) {}

    public function handle(Request $request, string $projectDir): array
    {
        // Tablica na wyniki kompresji
        $compressedImages = [];

        // Katalog tymczasowy do zapisu przesłanych plików
        $uploadDir = $projectDir . '/public/uploads/temp/';

        // Upewnij się, że katalog istnieje
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        // Pobierz wszystkie przesłane pliki
        $files = $request->files->all();

        foreach ($files as $key => $uploadedFile) {
            if ($uploadedFile instanceof UploadedFile) {
                // Generuj unikalną nazwę pliku
                $originalFilename = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
                $safeFilename = transliterator_transliterate(
                    'Any-Latin; Latin-ASCII; [^A-Za-z0-9_] remove; Lower()',
                    $originalFilename
                );
                $newFilename = $safeFilename . '-' . uniqid() . '.' . $uploadedFile->guessExtension();

                // Przenieś plik do katalogu tymczasowego
                $uploadedFile->move($uploadDir, $newFilename);

                // Ścieżka do pliku względem katalogu publicznego
                $relativePath = 'uploads/temp/' . $newFilename;

                // Wybierz odpowiedni filtr w zależności od typu pliku
                $mimeType = $uploadedFile->getMimeType();
                $filterName = $this->getFilterNameForMimeType($mimeType);

                // Zastosuj filtr kompresji
                $compressedPath = $this->cacheManager->getBrowserPath($relativePath, $filterName);

                // Zastosuj filtr WebP (dla przeglądarek wspierających WebP)
                $webpPath = $this->cacheManager->getBrowserPath($relativePath, 'webp_conversion');

                // Zastosuj filtr do miniatury
                $thumbnailPath = $this->cacheManager->getBrowserPath($relativePath, 'thumbnail_jpeg');
                $thumbnailWebpPath = $this->cacheManager->getBrowserPath($relativePath, 'thumbnail_webp');

                // Pobierz rozmiar oryginalnego pliku
                $originalSize = filesize($uploadDir . $newFilename);

                // Pobierz rozmiar skompresowanego pliku
                $compressedFilePath = $projectDir . '/public/media/cache/' . $filterName . '/' . $relativePath;
                $compressedSize = file_exists($compressedFilePath) ? filesize($compressedFilePath) : 0;

                // Dodaj informacje o skompresowanym obrazie do wyników
                $compressedImages[] = [
                    'originalName' => $uploadedFile->getClientOriginalName(),
                    'originalSize' => $originalSize,
                    'compressedSize' => $compressedSize,
                    'compressionRatio' => $originalSize > 0 ? round((1 - ($compressedSize / $originalSize)) * 100, 2) : 0,
                    'url' => $compressedPath,
                    'webpUrl' => $webpPath,
                    'thumbnailUrl' => $thumbnailPath,
                    'thumbnailWebpUrl' => $thumbnailWebpPath,
                    'mimeType' => $mimeType
                ]; 
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
                return 'jpeg_optimized'; // Domyślny filtr
        }
    }
}
