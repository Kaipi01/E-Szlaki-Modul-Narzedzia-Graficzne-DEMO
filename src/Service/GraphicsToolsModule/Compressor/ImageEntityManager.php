<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Entity\GTMImage;
use App\Entity\User; 
use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageEntityManagerInterface;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Exception;
use Psr\Log\LoggerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class ImageEntityManager implements ImageEntityManagerInterface
{
    public function __construct(private EntityManagerInterface $entityManager, private TokenStorageInterface $tokenStorage, private LoggerInterface $logger) {}
    public function save(array $imageData): void 
    {
        $owner = $this->getUserFromToken(); 
        $gtmImage = new GTMImage();

        $gtmImage
            ->setMimeType($imageData['mimeType'])
            ->setName($imageData['name'])
            ->setOperationId($imageData['operationId'])
            ->setOperationResults($imageData['operationResults'])
            ->setOperationType($imageData['operationType'] ?? GTMImage::OPERATION_CONVERSION)
            ->setOwner($owner)
            ->setSize($imageData['size'])
            ->setSrc($imageData['src'])
            ->setUploadedAt(new DateTime("now"))
        ;

        $this->saveInDataBase($gtmImage);
    }

    public function saveAsCompressed(DTO\CompressionResults $compressionResults, string $operationId): void
    {
        $owner = $this->getUserFromToken();

        $gtmImage = new GTMImage();

        $gtmImage
            ->setMimeType($compressionResults->mimeType)
            ->setName($compressionResults->originalName)
            ->setOperationId($operationId)
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
     * @throws \Exception
     * @return string|\Stringable|\Symfony\Component\Security\Core\User\UserInterface
     */
    private function getUserFromToken(): User
    {
        $securityToken = $this->tokenStorage->getToken();

        if (!$securityToken) {
            throw new Exception("Brak dostępu!");
        }

        return $securityToken->getUser();
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
}
