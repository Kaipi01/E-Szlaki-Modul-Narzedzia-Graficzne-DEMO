<?php

namespace App\Service\GraphicsToolsModule\Utils\Contracts;

use Symfony\Component\HttpFoundation\File\UploadedFile;

interface ImageFileValidatorInterface
{
    /**
     * Waliduje obraz pod kątem typu MIME i bezpiecznej nazwy pliku 
     * @param UploadedFile $image Plik obrazu do walidacji
     * @throws \InvalidArgumentException Gdy obraz nie przejdzie walidacji
     */
    public function validate(UploadedFile $image): void;
}