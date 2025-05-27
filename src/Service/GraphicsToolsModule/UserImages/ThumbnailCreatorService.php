<?php

namespace App\Service\GraphicsToolsModule\UserImages;

use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
use App\Service\GraphicsToolsModule\Converter\Contracts\ConverterInterface;
use App\Service\GraphicsToolsModule\Editor\Contracts\ResizerImageInterface;
use App\Service\GraphicsToolsModule\UserImages\Contracts\ThumbnailCreatorInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageType;
use Symfony\Component\Mime\MimeTypeGuesserInterface;

class ThumbnailCreatorService implements ThumbnailCreatorInterface
{
    public const DEFAULT_IMAGE_WIDTH = 950;

    public function __construct(
        private readonly GTMLoggerInterface $logger,
        private readonly CompressorInterface $compressor,
        private readonly ConverterInterface $converter,
        private readonly ResizerImageInterface $resizer,
        private readonly MimeTypeGuesserInterface $mimeTypeGuesser,
    ) {
    }

    /** @inheritDoc */
    public function create(string $imagePath, string $thumbnailName, ?int $width = null): string
    {
        $thumbnailPath = dirname($imagePath) . "/" . $thumbnailName;

        $this->converter->convert(
            $imagePath,
            ImageType::MIME_WEBP,
            afterOperationCallback: $this->getAfterConversionCallback($width),
            outputPath: $thumbnailPath
        );

        return $thumbnailPath;
    }

    private function getAfterConversionCallback(?int $width = null): \Closure
    {
        return function (string $outputPath) use ($width) {
            $scaleToWidth = $width ?? self::DEFAULT_IMAGE_WIDTH;

            if ($this->resizer->getSize($outputPath)->width() > $scaleToWidth) {
                $this->resizer->scale($outputPath, $scaleToWidth);
            }
            $this->compressor->compress($outputPath);
        };
    }
}