<?php 

namespace App\Service\GraphicsToolsModule\Utils\Contracts;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;

interface UploadImageServiceInterface
{
    public function upload(UploadedFile $image, string $uploadDir, bool $keepOriginalName = false): ?string;

    public function uploadAllFromRequest(Request $request, string $uploadDir, bool $keepOriginalName = false): array;

    public function getSaveImageName(string $imagePath, bool $keepOriginalName = false): string; 
    public function ensureDirectoryExists(string $directory): void;
}