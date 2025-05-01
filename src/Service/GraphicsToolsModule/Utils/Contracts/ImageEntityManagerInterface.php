<?php 

namespace App\Service\GraphicsToolsModule\Utils\Contracts; 

interface ImageEntityManagerInterface
{
    public function save(array $imageData, int $userId): void;
}