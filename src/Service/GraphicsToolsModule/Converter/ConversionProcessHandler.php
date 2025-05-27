<?php

namespace App\Service\GraphicsToolsModule\Converter;

use App\Entity\GTMImage;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
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

    public function __construct(private ConverterInterface $converter, private ImageEntityManagerInterface $imageManager, private CompressorInterface $compressor)
    {
    }

    public function process(): ImageProcessData
    {
        $imagePath = $this->state->imagePath;
        $toFormat = $this->state->toFormat;
        $addCompress = $this->state->addCompress;
        $quality = $this->state->quality;
        $imageOriginalName = $this->state->imageOriginalName;

        $afterOperationCallback = null;

        if (!$imagePath || !file_exists($imagePath)) {
            throw new \RuntimeException('Nie znaleziono pliku do kompresji. Wykonaj najpierw krok przygotowania obrazu.');
        }  

        if ($addCompress) {
            $afterOperationCallback = fn (string $outPath) => $this->compressor->compress($outPath);
        }

        $this->state->conversionResults = $this->converter->convert(
            $imagePath, 
            $toFormat, 
            $quality, 
            $afterOperationCallback
        );   

        $this->state->conversionResults->originalName = $imageOriginalName;

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
