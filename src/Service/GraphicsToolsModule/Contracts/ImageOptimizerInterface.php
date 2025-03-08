<?php 

namespace App\Service\GraphicsToolsModule\Contracts;

interface ImageOptimizerInterface
{
    public function optimize(string $mimeType, string $imagePath): void;
}