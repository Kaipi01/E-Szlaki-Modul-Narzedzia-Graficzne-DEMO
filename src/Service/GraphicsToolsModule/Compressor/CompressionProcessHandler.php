<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Entity\GTMImage;
use App\Service\GraphicsToolsModule\Workflow\Abstract\ImageProcessHandler;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageProcessData;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionProcessState;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\Workflow\Contracts\ImageProcessHandlerInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;

class CompressionProcessHandler extends ImageProcessHandler implements ImageProcessHandlerInterface
{
    /** @var CompressionProcessState | null */
    protected $state;

    public function __construct(private CompressorInterface $compressor, private ImageEntityManagerInterface $imageManager)
    {
    }

    public function process(): ImageProcessData
    {
        if (!$this->state->imagePath || !file_exists($this->state->imagePath)) {
            throw new \RuntimeException('Nie znaleziono pliku do kompresji');
        }

        $this->state->compressionResults = $this->compressor->compress($this->state->imagePath); 
        $this->state->compressionResults->originalName = $this->state->imageOriginalName;

        return ImageProcessData::fromArray([
            'processHash' => $this->state->processHash,
            'status' => ImageOperationStatus::PROCESSING,
            'progress' => 80
        ]);
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
