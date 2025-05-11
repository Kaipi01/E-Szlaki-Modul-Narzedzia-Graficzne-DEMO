<?php

namespace App\Service\GraphicsToolsModule\Editor;

use App\Service\GraphicsToolsModule\Editor\Contracts\ResizerImageInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\GraphicsToolResolver;
use Intervention\Image\Interfaces\ImageInterface;
use Intervention\Image\Interfaces\SizeInterface;

class ResizerImageService implements ResizerImageInterface
{
    public function __construct(private GTMLoggerInterface $logger)
    {
    }

    private function getImage(string $imagePath): ImageInterface
    {
        return GraphicsToolResolver::getImageManager()->read($imagePath);
    }

    /** @inheritDoc */
    public function getSize(string $imagePath): SizeInterface
    {
        return $this->getImage($imagePath)->size();
    } 

    /** @inheritDoc */
    public function resize(string $imagePath, ?int $width = null, ?int $height = null): void
    {
        try {
            $this
                ->getImage($imagePath)
                ->resize($width, $height)
                ->save($imagePath);

        } catch (\Exception $e) {
            $this->logger->error(self::class . "::resize()  " . $e->getMessage());

            throw $e;
        }
    }

    /** @inheritDoc */
    public function resizeDown(string $imagePath, int|null $width = null, int|null $height = null): void
    {
        try {
            $this
                ->getImage($imagePath)
                ->resizeDown($width, $height)
                ->save($imagePath);

        } catch (\Exception $e) {
            $this->logger->error(self::class . "::resizeDown()  " . $e->getMessage());

            throw $e;
        }
    }

    /** @inheritDoc */
    public function scale(string $imagePath, int|null $width = null, int|null $height = null): void
    {
        try {
            $this
                ->getImage($imagePath)
                ->scale($width, $height)
                ->save($imagePath);

        } catch (\Exception $e) {
            $this->logger->error(self::class . "::scale()  " . $e->getMessage());

            throw $e;
        }
    }

    /** @inheritDoc */
    public function scaleDown(string $imagePath, int|null $width = null, int|null $height = null): void
    {
        try {
            $this
                ->getImage($imagePath)
                ->scaleDown($width, $height)
                ->save($imagePath);

        } catch (\Exception $e) {
            $this->logger->error(self::class . "::scaleDown()  " . $e->getMessage());

            throw $e;
        }
    }
}