<?php

namespace App\Service\GraphicsToolsModule\Utils;

use App\Event\GTMImageEvent;
use App\Service\GraphicsToolsModule\Utils\PathResolver;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\UserImages\Contracts\ThumbnailCreatorInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Mime\MimeTypeGuesserInterface;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\GTMImage;
use App\Entity\User;
use Exception;
use DateTime;

class ImageEntityManager implements ImageEntityManagerInterface
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private GTMLoggerInterface $logger,
        private PathResolver $pathResolver,
        private MimeTypeGuesserInterface $mimeTypeGuesser,
        private EventDispatcherInterface $eventDispatcher,
        private KernelInterface $kernel,
        private ThumbnailCreatorInterface $thumbnailCreator
    ) {
    }

    /** @inheritDoc */
    public function save(array $imageData, int $userId): void
    {
        $owner = $this->findUser($userId);
        $gtmImage = new GTMImage();
        $imageSrc = $imageData['src'] ?? null;
        $operationHash = $imageData['operationHash'] ?? null;

        if (!$imageSrc || !$this->pathResolver->isAbsolutePath($imageSrc)) {
            throw new \InvalidArgumentException("Nie podano ścieżki absolutnej do obrazu !");
        }
        if (!$operationHash) {
            throw new \InvalidArgumentException('Nie podano parametru: operationHash !');
        }

        $thumbnailName = "thumbnail-" . pathinfo($imageSrc, PATHINFO_FILENAME) . ".webp";

        $thumbnailSrc = $this->thumbnailCreator->create($imageSrc, $thumbnailName);

        $gtmImage
            ->setMimeType($this->mimeTypeGuesser->guessMimeType($imageSrc))
            ->setName($imageData['originalName'])
            ->setServerName(basename($imageSrc))
            ->setOperationHash($operationHash)
            ->setOperationResults($imageData['operationResults'] ?? [])
            ->setOperationType($imageData['operationType'] ?? GTMImage::OPERATION_CONVERSION)
            ->setOwner($owner)
            ->setSize(filesize($imageSrc))
            ->setThumbnailSrc($this->pathResolver->getRelativePath($thumbnailSrc))
            ->setSrc($this->pathResolver->getRelativePath($imageSrc))
            ->setUploadedAt(new DateTime("now"))
        ;

        $this->eventDispatcher->dispatch(new GTMImageEvent($userId), GTMImage::IMAGE_CREATED);

        $this->saveInDataBase($gtmImage);
    }

    /** @inheritDoc */
    public function remove(GTMImage $image, int $userId): void
    {
        $imageSrc = $image->getSrc();
        $thumbnailSrc = $image->getThumbnailSrc();
        $publicFolderPath = $this->kernel->getProjectDir() . '/public';

        $this->entityManager->remove($image);
        $this->entityManager->flush();

        unlink($publicFolderPath . $imageSrc);
        unlink($publicFolderPath . $thumbnailSrc);

        $this->eventDispatcher->dispatch(new GTMImageEvent($userId), GTMImage::IMAGE_DELETED);
    }

    /** @inheritDoc */
    public function removeAll(array $images, int $userId): void
    {
        $publicFolderPath = $this->kernel->getProjectDir() . '/public';

        foreach ($images as $image) {
            $imageSrc = $image->getSrc();
            $thumbnailSrc = $image->getThumbnailSrc();

            $this->entityManager->remove($image);

            unlink($publicFolderPath . $imageSrc);
            unlink($publicFolderPath . $thumbnailSrc);
        }

        $this->entityManager->flush();

        $this->eventDispatcher->dispatch(new GTMImageEvent($userId), GTMImage::IMAGE_DELETED);
    }

    /** 
     * @param \App\Entity\GTMImage $gtmImage
     * @throws \Exception
     * @return void
     */
    private function saveInDataBase(GTMImage $gtmImage)
    {
        try {
            $this->entityManager->persist($gtmImage);
            $this->entityManager->flush();
        } catch (Exception $e) {
            $this->logger->error(self::class . "::saveInDataBase() " . $e->getMessage());
            throw new Exception("Wystąpił błąd podczas dodawania grafiki do bazy danych!");
        }
    }

    private function findUser(int $userId): User
    {
        return $this->entityManager->getRepository(User::class)->find($userId);
    }
}
