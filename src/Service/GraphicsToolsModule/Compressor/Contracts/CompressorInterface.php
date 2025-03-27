<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts; 

use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;

interface CompressorInterface 
{  
    public function compress(string $imagePath, string $mimeType): CompressionResults;
}