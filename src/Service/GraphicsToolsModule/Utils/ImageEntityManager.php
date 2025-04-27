<?php

namespace App\Service\GraphicsToolsModule\Utils;

use App\Service\GraphicsToolsModule\Utils\PathResolver;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageEntityManagerInterface;
use Symfony\Component\Mime\MimeTypeGuesserInterface;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\GTMImage;
use App\Entity\User;
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;
use Exception;
use DateTime;

class ImageEntityManager implements ImageEntityManagerInterface
{
    public function __construct(
        private EntityManagerInterface $entityManager, 
        private GTMLoggerInterface $logger, 
        private PathResolver $pathResolver,
        private MimeTypeGuesserInterface $mimeTypeGuesser,
    ) {}

    public function save(array $imageData, int $userId): void 
    {
        $owner = $this->findUser($userId); 
        $gtmImage = new GTMImage();
        $imageSrc = $imageData['src'] ?? null;
        $operationHash = $imageData['operationHash'] ?? null;

        if (! $imageSrc || ! $this->pathResolver->isAbsolutePath($imageSrc)) {
            throw new \InvalidArgumentException('Nie podano ścieżki absolutnej do obrazu !');
        }
        if (! $operationHash) {
            throw new \InvalidArgumentException('Nie podano parametru: operationHash !');
        } 

        $gtmImage
            ->setMimeType($this->mimeTypeGuesser->guessMimeType($imageSrc))
            ->setName(basename($imageSrc))
            ->setOperationHash($operationHash)
            ->setOperationResults($imageData['operationResults'] ?? [])
            ->setOperationType($imageData['operationType'] ?? GTMImage::OPERATION_CONVERSION)
            ->setOwner($owner)
            ->setSize(filesize($imageSrc))
            ->setSrc($this->pathResolver->getRelativePath($imageSrc))
            ->setUploadedAt(new DateTime("now"))
        ;

        $this->saveInDataBase($gtmImage);
    }

    public function saveAsCompressed(CompressionResults $compressionResults, string $operationHash, int $userId): void
    {
        $owner = $this->findUser($userId);

        $gtmImage = new GTMImage();

        $gtmImage
            ->setMimeType($compressionResults->mimeType)
            ->setName($compressionResults->originalName)
            ->setOperationHash($operationHash)
            ->setOperationResults($compressionResults->toArray())
            ->setOperationType(GTMImage::OPERATION_COMPRESSION)
            ->setOwner($owner)
            ->setSize($compressionResults->compressedSize)
            ->setSrc($this->pathResolver->getRelativePath($compressionResults->src))
            ->setUploadedAt(new DateTime("now"))
        ;

        $this->saveInDataBase($gtmImage);
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
            $this->logger->error($e->getMessage());
            throw new Exception("Wystąpił błąd podczas dodawania grafiki do bazy danych!");
        }
    }

    private function findUser(int $userId): User
    {
        return $this->entityManager->getRepository(User::class)->find($userId);
    }
}
