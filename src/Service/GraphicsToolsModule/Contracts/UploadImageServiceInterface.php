<?php 

namespace App\Service\GraphicsToolsModule\Contracts;

use Symfony\Component\HttpFoundation\File\UploadedFile;

interface UploadImageServiceInterface
{
    public function upload(UploadedFile $image, string $uploadDir): string;

    public function getSaveImageName(UploadedFile $image): string;
}