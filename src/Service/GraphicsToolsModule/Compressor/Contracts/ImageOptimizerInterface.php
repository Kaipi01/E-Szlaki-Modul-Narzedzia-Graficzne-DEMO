<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts;

interface ImageOptimizerInterface
{
    /**
     * Optymalizuje obraz 
     * @param string $imagePath Ścieżka do pliku 
     * @param int $strength Siła optymalizacji 
     */
    public function optimize(string $imagePath, int $strength = 80): void;
}