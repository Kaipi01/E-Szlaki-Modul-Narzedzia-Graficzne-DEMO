<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageEntityManagerInterface; 
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface; 
use App\Entity\GTMImage;
use App\Entity\User;
use Exception;
use DateTime;

class ImageEntityManager implements ImageEntityManagerInterface
{
    public function __construct(private EntityManagerInterface $entityManager, private LoggerInterface $logger) {}
    public function save(array $imageData, int $userId): void 
    {
        $owner = $this->findUser($userId); 
        $gtmImage = new GTMImage();

        $gtmImage
            ->setMimeType($imageData['mimeType'])
            ->setName($imageData['name'])
            ->setOperationHash($imageData['operationHash'])
            ->setOperationResults($imageData['operationResults'])
            ->setOperationType($imageData['operationType'] ?? GTMImage::OPERATION_CONVERSION)
            ->setOwner($owner)
            ->setSize($imageData['size'])
            ->setSrc($imageData['src'])
            ->setUploadedAt(new DateTime("now"))
        ;

        $this->saveInDataBase($gtmImage);
    }

    public function saveAsCompressed(DTO\CompressionResults $compressionResults, string $operationHash, int $userId): void
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
            ->setSrc($compressionResults->src)
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
