<?php 

namespace App\Service\GraphicsToolsModule\Compressor;
 
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
    
    public function __construct(private CompressorInterface $compressor, protected ImageEntityManagerInterface $imageManager)
    {
        parent::__construct($imageManager);
    }  

    public function process(): ImageProcessData
    {
        if (!$this->state->destinationPath || !file_exists($this->state->destinationPath)) {
            throw new \RuntimeException('Nie znaleziono pliku do kompresji. Wykonaj najpierw krok przygotowania obrazu.');
        }

        $results = $this->compressor->compress($this->state->destinationPath);

        $this->state->compressionResults = $results;

        return ImageProcessData::fromArray([
            'processHash' => $this->state->processHash,
            'status' => ImageOperationStatus::PROCESSING,
            'progress' => 80
        ]);
    }

    public function finalize(): ImageProcessData
    {
        $this->imageManager->saveAsCompressed(
            $this->state->compressionResults,
            $this->state->processHash,
            $this->state->ownerId
        );

        return ImageProcessData::fromArray([
            'processHash' => $this->state->processHash,
            'status' => ImageOperationStatus::PROCESSING,  
            'progress' => 90 
        ]);
    }
}
