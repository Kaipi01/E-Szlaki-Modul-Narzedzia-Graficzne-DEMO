<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts;

interface ImageOptimizerInterface
{
    /**
     * Optymalizuje obraz 
     * @param string $imagePath Ścieżka do pliku 
     * @param int $quality Siła optymalizacji 
     */
    public function optimize(string $imagePath, int $quality = 80): void;
}