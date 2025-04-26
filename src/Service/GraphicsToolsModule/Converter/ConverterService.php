<?php

namespace App\Service\GraphicsToolsModule\Converter;

use App\Service\GraphicsToolsModule\Converter\Contracts\ConverterInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageExtensionTool;
use Intervention\Image\Drivers\Imagick\Driver as DriverImagick;
use Intervention\Image\Drivers\GD\Driver as DriverGD;
use Intervention\Image\ImageManager;

class ConverterService implements ConverterInterface
{
    private ImageManager $imageManager;

    public function __construct(private ImageExtensionTool $imageExtensionTool, private GTMLoggerInterface $logger)
    {
        $driver = $this->imageExtensionTool->isImagickAvailable() ? new DriverImagick() : new DriverGD();
        $this->imageManager = new ImageManager($driver);
    }

    /** @inheritDoc */
    public function convert(string $imagePath, string $convertToFormat, int $quality = 100): bool
    {
        try {
            $image = $this->imageManager->read($imagePath);

            $filename = pathinfo($imagePath, PATHINFO_FILENAME);
            $destDir = dirname($imagePath);
            $outputPath = "$destDir/$filename.$convertToFormat";

            $image
                ->encodeByMediaType($convertToFormat, quality: $quality)
                ->save($outputPath);

        } catch (\Exception $e) {
            $this->logger->error($e->getMessage());

            return false;
        }

        return true;
    }
}