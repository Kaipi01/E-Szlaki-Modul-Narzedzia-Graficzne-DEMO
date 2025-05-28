<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Entity\GTMImage;
use App\Service\GraphicsToolsModule\Editor\DTO\ResizeImageOptions;
use App\Service\GraphicsToolsModule\Workflow\Abstract\ImageProcessHandler;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageProcessData;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionProcessState;
use App\Service\GraphicsToolsModule\Editor\Contracts\ResizerImageInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\Workflow\Contracts\ImageProcessHandlerInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;

class CompressionProcessHandler extends ImageProcessHandler implements ImageProcessHandlerInterface
{
    /** @var CompressionProcessState | null */
    protected $state;

    public function __construct(private CompressorInterface $compressor, private ImageEntityManagerInterface $imageManager, private ResizerImageInterface $resizer)
    {
    }

    public function process(): ImageProcessData
    {
        $imagePath = $this->state->imagePath;
        $compressionQuality = $this->state->compressionQuality;
        $resizeOptions = $this->state->resizeOptions;
        $afterOperationCallback = null;

        if (!$imagePath || !file_exists($imagePath)) {
            throw new \RuntimeException('Nie znaleziono pliku do kompresji');
        }

        if ($resizeOptions !== null) {
            $afterOperationCallback = $this->getResizeImageCallback($resizeOptions);
        }

        $this->state->compressionResults = $this->compressor->compress($imagePath, $compressionQuality, $afterOperationCallback);
        $this->state->compressionResults->originalName = $this->state->imageOriginalName;

        return ImageProcessData::fromArray([
            'processHash' => $this->state->processHash,
            'status' => ImageOperationStatus::PROCESSING,
            'progress' => 80
        ]);
    }

    private function getResizeImageCallback(ResizeImageOptions $resizeOptions): callable
    {
        return function (string $imagePath) use ($resizeOptions) {

            $resizeBy = $resizeOptions->resizeBy;
            $imageSize = $this->resizer->getSize($imagePath);

            $resizeOptionIsValid = fn($value, int $maxValue): bool => is_numeric($value) && $value <= $maxValue && $value > 0;

            if (
                $resizeBy === ResizeImageOptions::RESIZE_BY_PERCENT &&
                $resizeOptionIsValid($resizeOptions->percent, 100)
            ) {
                $widthToShrink = ($resizeOptions->percent / 100.0) * $imageSize->width();
                $calculatedWidth = $imageSize->width() - $widthToShrink ;

                $this->resizer->scale($imagePath, width: $calculatedWidth);
            }
            if (
                $resizeBy === ResizeImageOptions::RESIZE_BY_WIDTH &&
                $resizeOptionIsValid($resizeOptions->width, $imageSize->width())
            ) {

                $this->resizer->scale($imagePath, width: $resizeOptions->width);
            }
            if (
                $resizeBy === ResizeImageOptions::RESIZE_BY_HEIGHT &&
                $resizeOptionIsValid($resizeOptions->height, $imageSize->height())
            ) {

                $this->resizer->scale($imagePath, height: $resizeOptions->height);
            }
        };
    }

    public function finalize(): ImageProcessData
    {
        $this->imageManager->save(
            [
                'src' => $this->state->imagePath,
                'originalName' => $this->state->imageOriginalName,
                'operationHash' => $this->state->processHash,
                'operationResults' => $this->state->compressionResults->toArray(),
                'operationType' => GTMImage::OPERATION_COMPRESSION
            ],
            $this->state->ownerId
        );

        return ImageProcessData::fromArray([
            'processHash' => $this->state->processHash,
            'status' => ImageOperationStatus::PROCESSING,
            'progress' => 90
        ]);
    }
}
