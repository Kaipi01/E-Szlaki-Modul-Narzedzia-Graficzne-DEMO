<?php 

namespace App\Service\GraphicsToolsModule\Utils\Contracts;

use Symfony\Component\HttpFoundation\File\UploadedFile;

interface ImageProcessDispatcherInterface
{
    public function dispatch(string $processHash, int $userId, UploadedFile $image, string $operationType): void;
}