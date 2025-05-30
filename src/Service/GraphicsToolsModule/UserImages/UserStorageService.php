<?php

namespace App\Service\GraphicsToolsModule\UserImages;

use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\UserImages\Contracts\UserStorageInterface;
use App\Service\GraphicsToolsModule\UserImages\DTO\UserStorageInfo;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Filesystem\Exception\FileNotFoundException;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\HttpKernel\KernelInterface;

class UserStorageService implements UserStorageInterface
{
    public const DISC_STORAGE_UNIT = 'MB';
    public const MAX_DISC_STORAGE = 500;

    public function __construct(
        private readonly GTMImageRepository $imageRepository,
        private readonly GTMLoggerInterface $logger,
        private readonly KernelInterface $kernel,
        private readonly ContainerInterface $container
    ) {
    }

    /** @inheritDoc */
    public function isUserHaveEnoughSpace(int $userId, int $newUploadFileSize): bool
    {
        $userFolderSize = $this->getUserFolderSize($userId);
        $maxStorageInBytes = self::MAX_DISC_STORAGE * $this->getBytesByCurrentUnit();

        return ($userFolderSize + $newUploadFileSize) < $maxStorageInBytes;
    }

    public function getUserStorageData(int $userId): UserStorageInfo
    {
        $userFolderSize = 0;

        try {
            $userFolderSize = $this->getUserFolderSize($userId);
        } catch (\Exception $e) {
            $this->logger->error(__METHOD__ . ": " . $e->getMessage());
        }

        $userCurrentDiscStorage = $userFolderSize / $this->getBytesByCurrentUnit();

        return UserStorageInfo::fromArray([
            'maxDiscStorage' => self::MAX_DISC_STORAGE,
            'discStorageUnit' => self::DISC_STORAGE_UNIT,
            'currentDiscStorage' => round($userCurrentDiscStorage, 2),
            'currentDiscStoragePercent' => ($userCurrentDiscStorage / self::MAX_DISC_STORAGE) * 100
        ]);
    }

    /** @inheritDoc */
    public function getUserFolderSize(int $userId): int
    {
        $userFolder = $this->container->getParameter('gtm_uploads') . "/" . $userId;

        if (!is_dir($userFolder)) {
            throw new FileNotFoundException("Folder użytkownika {$userId} nie istnieje.");
        }

        return $this->getFolderSize($userFolder);
    }

    private function getFolderSize(string $folder): int
    {
        $size = 0;
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($folder, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            /** @var File $file */
            if ($file->isFile()) {
                $size += $file->getSize();
            }
        }

        return $size;
    }

    private function getBytesByCurrentUnit(): int
    {
        $unitMap = [
            'KB' => 1_024,
            'MB' => 1_048_576,
            'GB' => 1_073_741_824,
        ];

        if (!isset($unitMap[self::DISC_STORAGE_UNIT])) {
            $validUnits = implode(', ', array_keys($unitMap));
            $currentUnit = self::DISC_STORAGE_UNIT;

            throw new \LogicException("Nieobsługiwana jednostka: $currentUnit. Obsługiwane: $validUnits");
        }

        return $unitMap[self::DISC_STORAGE_UNIT];
    }
}