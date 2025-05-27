<?php

namespace App\Service\GraphicsToolsModule\UserImages\Contracts;

interface ThumbnailCreatorInterface
{
    /**
     * Przerabia podaną grafikę na miniaturkę
     * @param string $thumbnailPath - ścieżka do grafiki
     * @param string $thumbnailName - nazwa miniaturki
     * @param mixed $width - docelowa szerokość
     * @return string - ścieżka absolutna do miniaturki
     */
    public function create(string $imagePath, string $thumbnailName, ?int $width = null): string;
}