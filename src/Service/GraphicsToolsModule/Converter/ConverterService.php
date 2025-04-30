<?php

namespace App\Service\GraphicsToolsModule\Converter;

use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
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
        private PathResolver $pathResolver,
        private CompressorInterface $compressor
    ) {
        $driver = $this->imageExtensionTool->isImagickAvailable() ? new DriverImagick() : new DriverGD();
        $this->imageManager = new ImageManager($driver);
    }

    /** @inheritDoc */
    public function convert(string $imagePath, string $mimeType, int $quality = 100): ConversionResults
    {
        $formatName = $this->getFormatName($mimeType);

        try {
            $image = $this->imageManager->read($imagePath);
            $originalName = basename($imagePath);
            $destDir = dirname($imagePath);
            $filename = pathinfo($imagePath, PATHINFO_FILENAME);
            $outputPath = "$destDir/$filename.$formatName";

            if (!file_exists($destDir)) {
                mkdir($destDir, 0777, true);
            }

            $image
                ->encodeByMediaType($mimeType, quality: $quality)
                ->save($outputPath);

            // Od razu skompresuj
            // $this->compressor->compress($outputPath);

            $originalFormat = pathinfo($imagePath, PATHINFO_EXTENSION);
            $outputName = "$filename.$formatName";
            $originalSize = filesize($imagePath);
            $downloadUrl = $this->urlGenerator->generate(
                'gtm_download_image',
                ['imageName' => $outputName],
                UrlGeneratorInterface::ABSOLUTE_URL
            );
            $conversionSize = file_exists($outputPath) ? filesize($outputPath) : 0;


        } catch (\Exception $e) {
            $this->logger->error(self::class . "::convert() " . $e->getMessage());

            throw new \Exception("Wystąpił błąd podczas konwersji formatu na $formatName !");
        }

        return ConversionResults::fromArray([
            'originalName' => $originalName,
            'newName' => $outputName,
            'originalSize' => $originalSize,
            'originalFormat' => $originalFormat,
            'conversionSize' => $conversionSize,
            'conversionFormat' => $formatName,
            'conversionQuality' => $quality,
            'src' => $this->pathResolver->getRelativePath($outputPath),
            'absoluteSrc' => $outputPath,
            'downloadURL' => $downloadUrl,
            'mimeType' => $this->mimeTypeGuesser->guessMimeType($outputPath),
        ]);
    }

    private function getFormatName(string $mimeType): string
    {
        $formatName = str_replace('image/', '', $mimeType);

        if ($formatName === "jpeg") return "jpg";

        return $formatName;
    }
}