<?php 

namespace App\Service\GraphicsToolsModule\UserImages\Contracts;

use App\Service\GraphicsToolsModule\UserImages\DTO\UserStorageInfo;
use Symfony\Component\Filesystem\Exception\FileNotFoundException;

interface UserStorageInterface
{
    /**
     * Czy użytkownik posiada wystarczjąco dużo miejsca
     * @param int $userId
     * @param int $newUploadFileSize
     * @return bool
     */
    public function isUserHaveEnoughSpace(int $userId, int $newUploadFileSize): bool;

    public function getUserStorageData(int $userId): UserStorageInfo;

    /**
     * Zwraca rozmiar folderu użytkownika w bajtach
     * @param int $userId
     * @throws FileNotFoundException
     * @return int
     */
    public function getUserFolderSize(int $userId): int;
}