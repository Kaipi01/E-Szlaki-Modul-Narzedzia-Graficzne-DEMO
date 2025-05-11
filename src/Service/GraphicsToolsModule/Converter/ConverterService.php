<?php

namespace App\Service\GraphicsToolsModule\Converter;

use App\Service\GraphicsToolsModule\Converter\Contracts\ConverterInterface;
use App\Service\GraphicsToolsModule\Converter\DTO\ConversionResults;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\GraphicsToolResolver;
use App\Service\GraphicsToolsModule\Utils\PathResolver;
use Symfony\Component\Mime\MimeTypeGuesserInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class ConverterService implements ConverterInterface
{ 
    public function __construct(
        private GTMLoggerInterface $logger,
        private UrlGeneratorInterface $urlGenerator,
        private MimeTypeGuesserInterface $mimeTypeGuesser,
        private PathResolver $pathResolver
    ) {}

    /** @inheritDoc */
    public function convert(string $imagePath, string $convertToType, int $quality = 100, ?\Closure $afterOperationCallback = null): ConversionResults
    {
        $formatName = $this->getFormatName($convertToType);

        try {
            $image = GraphicsToolResolver::getImageManager()->read($imagePath);
            $imageName = basename($imagePath);
            $destDir = dirname($imagePath);
            $filename = pathinfo($imagePath, PATHINFO_FILENAME);
            $outputPath = "$destDir/$filename.$formatName";

            if (!file_exists($destDir)) {
                mkdir($destDir, 0777, true);
            }

            $image
                ->encodeByMediaType($convertToType, quality: $quality)
                ->save($outputPath); 

            if (is_callable($afterOperationCallback)) {
                $afterOperationCallback($outputPath);
            }

            $originalFormat = pathinfo($imagePath, PATHINFO_EXTENSION);
            $outputName = "$filename.$formatName";
            $originalSize = filesize($imagePath);
            $downloadUrl = $this->urlGenerator->generate('gtm_download_image',['serverName' => $outputName],UrlGeneratorInterface::ABSOLUTE_URL);
            $conversionSize = file_exists($outputPath) ? filesize($outputPath) : 0;


        } catch (\Exception $e) {
            $this->logger->error(self::class . "::convert() " . $e->getMessage());

            throw new \Exception("Wystąpił błąd podczas konwersji formatu na $formatName !");
        }

        return ConversionResults::fromArray([
            'imageName' => $imageName,
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