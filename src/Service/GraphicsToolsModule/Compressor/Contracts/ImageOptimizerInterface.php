<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts;

interface ImageOptimizerInterface
{
    /**
     * Optymalizuje obraz 
     * @param string $imagePath Ścieżka do pliku 
     */
    public function optimize(string $imagePath): void;
}