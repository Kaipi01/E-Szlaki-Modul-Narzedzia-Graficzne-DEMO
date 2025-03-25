<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageOptimizerInterface;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;  
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults; 
use App\Service\GraphicsToolsModule\Utils\Contracts\UploadImageServiceInterface; 
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Psr\Log\LoggerInterface;

class CompressorService implements CompressorInterface
{    
    public function __construct(
        private LoggerInterface $logger,
        private UploadImageServiceInterface $uploadService,
        private ImageOptimizerInterface $optimizer,  
        private UrlGeneratorInterface $urlGenerator 
    ) {} 
 
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
        $downloadUrl = $this->urlGenerator->generate(
            'gtm_download_image', 
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
            'src' => $imagePath,
            'downloadURL' => $downloadUrl,
            'mimeType' => $mimeType
        ]);
    }
}