<?php

namespace App\Controller;

use App\Entity\GTMImage;
use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route(path: '/profil')]
class GTMImageDataAPIController extends AbstractController
{
    public const GET_IMAGE_DATA_URL = '/profil/narzedzia-graficzne/api/pobierz-dane-o-grafice-json';
    
    public function __construct(private GTMLoggerInterface $logger)
    {
    }

    /** Zwraca dane o operacji grafiki */
    #[Route(path: '/narzedzia-graficzne/api/pobierz-dane-o-grafice-json/{processHash}', name: 'gtm_api_get_operation_image_data', methods: ['GET'])]
    public function getOperationImageData(string $processHash, GTMImageRepository $imageRepository): JsonResponse
    {
        $status = Response::HTTP_OK;
        $jsonData = [];

        try {
            if (!$this->getUser()) {
                $status = Response::HTTP_UNAUTHORIZED;
                throw new \Exception('Odmowa dostępu. Użytkownik nie jest zalogowany w systemie');
            }
            /** @var GTMImage */
            $image = $imageRepository->findOneBy(['operationHash' => $processHash, 'owner' => $this->getUser()]);

            if (!$image) {
                $status = Response::HTTP_NOT_FOUND;
                throw new \Exception('Żądana grafika nie istnieje');
            }

            $jsonData = [
                'success' => true,
                'errorMessage' => '',
                'imageData' => $image->getOperationResults(),
                'processData' => [
                    'progress' => 100,
                    'status' => ImageOperationStatus::COMPLETED
                ]
            ]; 

        } catch (\Exception $e) {
            $jsonData = [
                'success' => false,
                'errorMessage' => 'Wystąpił błąd podczas pobierania danych o grafice. ' . $e->getMessage(),
                'imageData' => [],
                'processData' => [
                    'progress' => 0,
                    'status' => ImageOperationStatus::FAILED
                ]
            ];

            $this->logger->error(self::class . '::getOperationImageData(): ' . $e->getMessage());
        }

        return $this->json($jsonData, $status);
    }
}