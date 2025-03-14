<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts;

interface ImageOptimizerInterface
{
    public function optimize(string $mimeType, string $imagePath): void;
}