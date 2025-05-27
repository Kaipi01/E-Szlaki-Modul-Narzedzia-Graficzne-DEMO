<?php

namespace App\Service\GraphicsToolsModule\Utils\Contracts;

use App\Entity\GTMImage;

interface ImageEntityManagerInterface
{
    /**
     * Zapisz grafikę do bazy danych
     * @param array $imageData
     * @param int $userId
     * @throws \InvalidArgumentException
     * @return void
     */
    public function save(array $imageData, int $userId): void;

    /**
     * Usuwa grafikę z bazy, usuwa również plik orginału i miniatruki z serwera
     * @param \App\Entity\GTMImage $image
     * @param int $userId
     * @return void
     */
    public function remove(GTMImage $image, int $userId): void;

    /**
     * Usuwa wszystkie grafiki użytkownika
     * @param GTMImage[] $images
     * @param int $userId
     * @return void
     */
    public function removeAll(array $images, int $userId): void;
}