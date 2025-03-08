<?php 

namespace App\Service\GraphicsToolsModule\Contracts;

use Symfony\Component\HttpFoundation\File\UploadedFile;

interface UploadImageServiceInterface
{
    public function upload(UploadedFile $image, string $uploadDir, bool $keepOriginalName = false): ?string;

    public function getSaveImageName(UploadedFile $image, bool $keepOriginalName = false): string;

    public function ensureDirectoryExists(string $directory): void;
}