<?php

namespace App\Service\GraphicsToolsModule\Converter;

use App\Service\GraphicsToolsModule\Converter\Contracts\ConverterInterface;
use App\Service\GraphicsToolsModule\Converter\DTO\ConversionResults;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageExtensionTool;
use App\Service\GraphicsToolsModule\Utils\PathResolver;
use Intervention\Image\Drivers\Imagick\Driver as DriverImagick;
use Intervention\Image\Drivers\GD\Driver as DriverGD;
use Intervention\Image\ImageManager;
use Symfony\Component\Mime\MimeTypeGuesserInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class ConverterService implements ConverterInterface
{
    private ImageManager $imageManager;

    public function __construct(
        private ImageExtensionTool $imageExtensionTool,
        private GTMLoggerInterface $logger,
        private UrlGeneratorInterface $urlGenerator,
        private MimeTypeGuesserInterface $mimeTypeGuesser,
        private PathResolver $pathResolver
    ) {
        $driver = $this->imageExtensionTool->isImagickAvailable() ? new DriverImagick() : new DriverGD();
        $this->imageManager = new ImageManager($driver);
    }

    /** @inheritDoc */
    public function convert(string $imagePath, string $convertToFormat, int $quality = 100): ConversionResults
    {
        try {
            $image = $this->imageManager->read($imagePath);

            $filename = pathinfo($imagePath, PATHINFO_FILENAME);
            $originalFormat = pathinfo($imagePath, PATHINFO_EXTENSION);
            $destDir = dirname($imagePath);
            $outputPath = "$destDir/$filename.$convertToFormat";
            $originalName = basename($imagePath);
            $originalSize = filesize($imagePath);
            $downloadUrl = $this->urlGenerator->generate(
                'gtm_download_image', 
                ['imageName' => $originalName], 
                UrlGeneratorInterface::ABSOLUTE_URL
            );

            $image
                ->encodeByMediaType($convertToFormat, quality: $quality)
                ->save($outputPath);

            $conversionSize = file_exists($outputPath) ? filesize($outputPath) : 0;

        } catch (\Exception $e) {
            $this->logger->error($e->getMessage());

            throw $e;
        }

        return ConversionResults::fromArray([
            'originalName' => $originalName,
            'originalSize' => $originalSize,
            'originalFormat' => $originalFormat,
            'conversionSize' => $conversionSize,
            'conversionFormat' => $convertToFormat,
            'conversionQuality' => $quality,
            'src' => $this->pathResolver->getRelativePath($imagePath),
            'downloadURL' => $downloadUrl,
            'mimeType' => $this->mimeTypeGuesser->guessMimeType($imagePath),
        ]);
    }
}