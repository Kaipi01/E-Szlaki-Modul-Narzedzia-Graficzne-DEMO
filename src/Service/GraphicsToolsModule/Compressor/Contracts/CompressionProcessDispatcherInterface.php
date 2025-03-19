<?php 

namespace App\Service\GraphicsToolsModule\Compressor\Contracts;

use Symfony\Component\HttpFoundation\File\UploadedFile;

interface CompressionProcessDispatcherInterface
{
    public function dispatch(string $processId, UploadedFile $image): void;
}