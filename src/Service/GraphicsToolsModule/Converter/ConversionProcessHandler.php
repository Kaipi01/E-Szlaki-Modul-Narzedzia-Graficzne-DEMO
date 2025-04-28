<?php

namespace App\Service\GraphicsToolsModule\Converter;

use App\Entity\GTMImage;
use App\Service\GraphicsToolsModule\Converter\Contracts\ConverterInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageProcessData;
use App\Service\GraphicsToolsModule\Converter\DTO\ConversionProcessState;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\Workflow\Abstract\ImageProcessHandler;
use App\Service\GraphicsToolsModule\Workflow\Contracts\ImageProcessHandlerInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;

class ConversionProcessHandler extends ImageProcessHandler implements ImageProcessHandlerInterface
{
    /** @var ConversionProcessState | null */
    protected $state;

    public function __construct(private ConverterInterface $compressor, protected ImageEntityManagerInterface $imageManager)
    {
        parent::__construct($imageManager);
    }

    public function process(): ImageProcessData
    {
        if (!$this->state->destinationPath || !file_exists($this->state->destinationPath)) {
            throw new \RuntimeException('Nie znaleziono pliku do kompresji. Wykonaj najpierw krok przygotowania obrazu.');
        } 

        $results = $this->compressor->convert($this->state->destinationPath, $this->state->toFormat, $this->state->quality);

        $this->state->conversionResults = $results; 

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
                'src' => $this->state->conversionResults->absoluteSrc, 
                'operationHash' => $this->state->processHash,
                'operationResults' => $this->state->conversionResults->toArray(),
                'operationType' => GTMImage::OPERATION_CONVERSION
            ],
            $this->state->ownerId
        ); 

        // if (file_exists($this->state->destinationPath)) {
        //     unlink($this->state->destinationPath);
        // } 

        return ImageProcessData::fromArray([
            'processHash' => $this->state->processHash,
            'status' => ImageOperationStatus::PROCESSING,
            'progress' => 90
        ]);
    }
}
