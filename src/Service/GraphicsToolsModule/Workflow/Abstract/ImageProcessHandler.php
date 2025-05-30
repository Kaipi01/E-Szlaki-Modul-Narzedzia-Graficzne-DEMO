<?php

namespace App\Service\GraphicsToolsModule\Workflow\Abstract;

use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageProcessData; 

abstract class ImageProcessHandler
{
    abstract public function process(): ImageProcessData;
    abstract public function finalize(): ImageProcessData;  
    protected $state;  
    
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

        return $processData;
    }
}