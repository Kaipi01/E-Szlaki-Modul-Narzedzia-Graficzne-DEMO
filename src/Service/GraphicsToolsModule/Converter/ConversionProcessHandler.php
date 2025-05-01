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

    public function __construct(private ConverterInterface $converter, private ImageEntityManagerInterface $imageManager)
    {
    }

    public function process(): ImageProcessData
    {
        if (!$this->state->imagePath || !file_exists($this->state->imagePath)) {
            throw new \RuntimeException('Nie znaleziono pliku do kompresji. Wykonaj najpierw krok przygotowania obrazu.');
        }  

        $this->state->conversionResults = $this->converter->convert(
            $this->state->imagePath, 
            $this->state->toFormat,
            $this->state->addCompress, 
            $this->state->quality
        ); 
        $this->state->conversionResults->originalName = $this->state->imageOriginalName;

        return ImageProcessData::fromArray([
            'processHash' => $this->state->processHash,
            'status' => ImageOperationStatus::PROCESSING,
            'progress' => 80
        ]);
    }

    public function finalize(): ImageProcessData
    {    
        $fromFormat = str_replace('image/', '', $this->state->conversionResults->originalFormat);
        $toFormat = str_replace('image/', '', $this->state->toFormat); 
        $orginalNameWithNewFormat = str_replace($fromFormat, $toFormat, $this->state->imageOriginalName); 

        $this->imageManager->save(
            [
                'src' => $this->state->conversionResults->absoluteSrc, 
                'originalName' => $orginalNameWithNewFormat,
                'operationHash' => $this->state->processHash,
                'operationResults' => $this->state->conversionResults->toArray(),
                'operationType' => GTMImage::OPERATION_CONVERSION
            ],
            $this->state->ownerId
        );

        if (file_exists($this->state->imagePath)) {
            unlink($this->state->imagePath);
        } 
        
        return ImageProcessData::fromArray([
            'processHash' => $this->state->processHash,
            'status' => ImageOperationStatus::PROCESSING,
            'progress' => 90
        ]);
    }
}
