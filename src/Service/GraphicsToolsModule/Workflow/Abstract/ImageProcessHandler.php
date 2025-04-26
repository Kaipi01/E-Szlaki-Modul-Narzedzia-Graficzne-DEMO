<?php

namespace App\Service\GraphicsToolsModule\Workflow\Contracts;

use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageProcessData;

abstract class ImageProcessHandler
{
    abstract public function process(): ImageProcessData;
    abstract public function finalize(): ImageProcessData; 

    protected $state; 
    
    public function __construct(protected ImageEntityManagerInterface $imageManager)
    {
    }
    
    public function setState(&$state) {
        $this->state = $state;
    }
    
    public function prepare(): ImageProcessData
    {
        $processData = ImageProcessData::fromArray([
            'processHash' => $this->state->processHash,
            'status' => ImageOperationStatus::PREPARING,
            'progress' => 40
        ]);

        if ($this->state->destinationPath && file_exists($this->state->destinationPath)) {
            return $processData; 
        }
        
        $imagePath = $this->state->imagePath;
        
        if (!$imagePath || !file_exists($imagePath)) {
            throw new \RuntimeException('Nie można odnaleźć pliku obrazu.');
        }
        
        $destinationDir = "{$this->state->processDir}/{$this->state->ownerId}";

        if (!is_dir($destinationDir)) {
            if (!mkdir($destinationDir, 0755, true)) {
                throw new \RuntimeException('Nie można utworzyć katalogu docelowego.');
            }
        }

        $originalName = $this->state->imageOriginalName;
            
        $destinationPath = $destinationDir . "/" . $originalName;

        if (!copy($imagePath, $destinationPath)) {
            throw new \RuntimeException('Nie udało się skopiować pliku.');
        }
        
        unlink($imagePath);

        $this->state->destinationPath = $destinationPath;

        return $processData;
    }
}