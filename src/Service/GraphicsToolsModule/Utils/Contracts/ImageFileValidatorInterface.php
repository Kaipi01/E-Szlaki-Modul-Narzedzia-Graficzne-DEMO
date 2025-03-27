<?php 

namespace App\Service\GraphicsToolsModule\Utils\Contracts;

use Symfony\Component\HttpFoundation\File\UploadedFile;

interface ImageFileValidatorInterface
{
    public function validate(UploadedFile $image): void;

    public function getSaveImageName(string $originalName, bool $keepOriginalName = false, bool $isUnique = false): string;
}