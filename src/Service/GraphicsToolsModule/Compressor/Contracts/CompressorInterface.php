<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts; 

use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;

interface CompressorInterface 
{  
    /**
     * Kompresuje pojedynczy obraz 
     * @param string $imagePath Ścieżka do obrazu
     * @return CompressionResults Wyniki kompresji
     * @throws \Exception W przypadku błędu kompresji
     */
    public function compress(string $imagePath): CompressionResults;
}