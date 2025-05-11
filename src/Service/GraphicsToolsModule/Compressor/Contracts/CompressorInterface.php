<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts; 

use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;

interface CompressorInterface 
{  
    /**
     * Kompresuje pojedynczy obraz 
     * @param string $imagePath Ścieżka do obrazu
     * @param int $strength Siła kompresji
     * @param \Closure|null $afterOperationCallback Callback wywołuje się tuż po zakończeniu operacji ale przed liczeniem wyniku
     * @return CompressionResults Wyniki kompresji
     * @throws \Exception W przypadku błędu kompresji
     */
    public function compress(string $imagePath, int $strength = 80, ?\Closure $afterOperationCallback = null): CompressionResults;
}