<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts; 

use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;
use Symfony\Component\HttpFoundation\Request;

interface CompressorInterface 
{  
    public function compress(string $imagePath, string $mimeType): CompressionResults;  

    public function compressAllFromRequest(Request $request): array;
}