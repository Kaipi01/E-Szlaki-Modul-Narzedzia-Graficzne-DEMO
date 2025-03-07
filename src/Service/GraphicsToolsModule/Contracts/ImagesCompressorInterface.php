<?php 

namespace App\Service\GraphicsToolsModule\Contracts;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;

interface ImagesCompressorInterface 
{
    public function handle(Request $reques, string $projectDir): array;

    public function compressImage(UploadedFile $image): array;
}