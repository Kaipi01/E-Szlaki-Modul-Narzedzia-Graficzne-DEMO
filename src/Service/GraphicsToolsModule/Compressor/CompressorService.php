<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageOptimizerInterface;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;  
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;
use App\Service\GraphicsToolsModule\Utils\Contracts\UploadImageServiceInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Psr\Log\LoggerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class CompressorService implements CompressorInterface
{ 
    private string $compressedDir; 

    public function __construct(
        private LoggerInterface $logger,
        private UploadImageServiceInterface $uploadService,
        private ImageOptimizerInterface $optimizer,  
        private UrlGeneratorInterface $urlGenerator,
        private string $projectDir
    ) { 
        $this->compressedDir = "{$this->projectDir}/public/graphics-tools-module/uploads/compressed";
        // $this->publicPath = "/graphics-tools-module/uploads/compressed";

        $this->uploadService->ensureDirectoryExists($this->compressedDir);
    }


    /** 
     * Kompresuje wszystkie obrazy z żądania HTTP 
     * @param \Symfony\Component\HttpFoundation\Request $request
     * @return CompressionResults[]
     */
    public function compressAllFromRequest(Request $request): array
    {
        $compressedImages = [];

        foreach ($request->files->all() as $key => $image) {
            if ($image instanceof UploadedFile) {
                try {
                    $imageName = $this->uploadService->upload($image, $this->compressedDir, true);

                    $compressedImages[] = $this->compress("{$this->compressedDir}/{$imageName}", $image->getMimeType()); 
                
                } catch(\Exception $e) {
                    $this->logger->error('Błąd podczas przetwarzania pliku', [
                        'originalName' => $image->getClientOriginalName(),
                        'error' => $e->getMessage()
                    ]);
                }
                
            }
        }

        return $compressedImages;
    }
 
    /**
     * Kompresuje pojedynczy obraz 
     * @param string $imagePath Ścieżka do obrazu
     * @param string $mimeType Typ MIME obrazu
     * @return CompressionResults Wyniki kompresji
     * @throws \Exception W przypadku błędu kompresji
     */
    public function compress(string $imagePath, string $mimeType): CompressionResults
    {  
        if (!file_exists($imagePath)) {
            throw new \Exception("Plik nie istnieje: {$imagePath}");
        }

        $originalName = basename($imagePath);
        $originalSize = filesize($imagePath);
        $relativePath = $this->getRelativePath($imagePath);
        $src = $relativePath ?: "/graphics-tools-module/uploads/compressed/{$originalName}"; 
        $downloadUrl = $this->urlGenerator->generate(
            'gtm_compressor_api_download_compressed_image', 
            ['imageName' => $originalName], 
            UrlGeneratorInterface::ABSOLUTE_URL
        );

        try { 
            $this->optimizer->optimize($mimeType, $imagePath); 
 
            $compressedSize = file_exists($imagePath) ? filesize($imagePath) : 0;
            $compressionRatio = $originalSize > 0 ? round((1 - ($compressedSize / $originalSize)) * 100, 2) : 0;
        } catch (\Exception $e) {
            $this->logger->error($e->getMessage()); 

            throw $e;
        } 

        return CompressionResults::fromArray([
            'originalName' => $originalName,
            'originalSize' => $originalSize,
            'compressedSize' => $compressedSize,
            'compressionRatio' => $compressionRatio,
            'src' => $src,
            'downloadURL' => $downloadUrl,
            'mimeType' => $mimeType
        ]);
    }

    /**
     * Próbuje określić względną ścieżkę URL dla pliku 
     * @param string $fullPath Pełna ścieżka systemowa do pliku
     * @return string|null Względna ścieżka URL lub null jeśli nie można określić
     */
    private function getRelativePath(string $fullPath): ?string
    {
        $publicDir = "{$this->projectDir}/public";
        
        // Sprawdź czy ścieżka zawiera katalog public
        if (strpos($fullPath, $publicDir) === 0) {
            // Usuń ścieżkę do katalogu public, pozostawiając względną ścieżkę
            $relativePath = substr($fullPath, strlen($publicDir));
            // Zamień backslashe na forwardslashe dla URL-i (ważne w Windows)
            return str_replace('\\', '/', $relativePath);
        }
        
        return null;
    }
}