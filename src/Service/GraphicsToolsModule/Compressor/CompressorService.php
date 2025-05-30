<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageOptimizerInterface;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;  
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\PathResolver;
use Symfony\Component\Mime\MimeTypeGuesserInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class CompressorService implements CompressorInterface
{    
    public function __construct(
        private GTMLoggerInterface $logger,
        private ImageOptimizerInterface $optimizer,  
        private UrlGeneratorInterface $urlGenerator,
        private MimeTypeGuesserInterface $mimeTypeGuesser,
        private PathResolver $pathResolver
    ) {} 
 
    /** @inheritDoc */
    public function compress(string $imagePath, int $quality = 80, ?\Closure $beforeOperationCallback = null): CompressionResults
    {  
        if (!file_exists($imagePath)) {
            throw new \Exception("Plik nie istnieje: {$imagePath}");
        }

        $imageName = basename($imagePath);
        $originalSize = filesize($imagePath);
        $downloadUrl = $this->urlGenerator->generate('gtm_download_image', ['serverName' => $imageName], UrlGeneratorInterface::ABSOLUTE_URL);

        try { 
            if (is_callable($beforeOperationCallback)) {
                $beforeOperationCallback($imagePath);
            } 

            $this->optimizer->optimize($imagePath, $quality); 

            $compressedSize = file_exists($imagePath) ? filesize($imagePath) : 0;
            $compressionRatio = $originalSize > 0 ? round((1 - ($compressedSize / $originalSize)) * 100, 2) : 0;

            if ($compressionRatio < 0) {
                $compressionRatio = 0;
            }
        } catch (\Exception $e) {
            $this->logger->error($e->getMessage()); 

            throw $e;
        } 

        return CompressionResults::fromArray([
            'imageName' => $imageName,
            'originalSize' => $originalSize,
            'compressedSize' => $compressedSize,
            'compressionQuality' => $quality,
            'compressionRatio' => $compressionRatio,
            'src' => $this->pathResolver->getRelativePath($imagePath),  
            'downloadURL' => $downloadUrl,
            'mimeType' => $this->mimeTypeGuesser->guessMimeType($imagePath)
        ]);
    }
}