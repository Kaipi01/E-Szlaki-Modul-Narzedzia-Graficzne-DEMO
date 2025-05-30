<?php

namespace App\Controller;

use App\Entity\GTMImage;
use App\Service\GraphicsToolsModule\UserImages\Contracts\UserStorageInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\UploadImageServiceInterface;
use App\Service\GraphicsToolsModule\Utils\Uuid;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Exception;
use Symfony\Component\HttpFoundation\Response;

#[Route(path: '/profil')]
class GTMEditorAPIController extends AbstractController
{
    public function __construct(
        private readonly GTMLoggerInterface $logger,
        private readonly UploadImageServiceInterface $uploader,
        private readonly ImageEntityManagerInterface $imageEntityManager,
        private readonly UserStorageInterface $storageService
    ) {
    }

    #[Route(path: '/narzedzia-graficzne/api/edytor-eksportuj-grafike-json', name: 'gtm_editor_api_export_image', methods: ['POST'])]
    public function exportImage(Request $request): JsonResponse
    {
        /** @var UploadedFile */
        $imageBlob = $request->files->get('imageBlob');
        $toFormat = $request->request->get('toFormat');
        $imageChanges = json_decode($request->request->get('imageChanges'), true);
        $status = Response::HTTP_OK;
        $user = $this->getUser();

        try {
            if (!$user) {
                $status = Response::HTTP_UNAUTHORIZED;
                throw new Exception('Odmowa dostępu!');
            }

            if (!$imageBlob) {
                $status = Response::HTTP_BAD_REQUEST;
                throw new Exception('Niepoprawne dane! Brakuje danych o grafice!');
            }

            if (!$toFormat) {
                $status = Response::HTTP_BAD_REQUEST;
                throw new Exception('Niepoprawne dane! Brakuje docelowego formatu!');
            }

            if (!$this->storageService->isUserHaveEnoughSpace($user->getId(), $imageBlob->getSize())) {
                $status = Response::HTTP_BAD_REQUEST;
                throw new Exception('Brak wolnego miejsca na dysku!');
            }

            $this->saveExportedImage($user->getId(), $imageBlob, $imageChanges);

            $jsonData = ['success' => true, 'errorMessage' => ''];

        } catch (Exception $e) {
            $status = $status === Response::HTTP_OK ? Response::HTTP_INTERNAL_SERVER_ERROR : $status;
            $jsonData = ['success' => false, 'errorMessage' => $e->getMessage()];

            $this->logger->error(self::class . '::compressImage: ' . $e->getMessage());
        }

        return $this->json($jsonData, $status);
    } 

    private function uploadExportedImage(int $userId, UploadedFile $imageBlob): array
    {
        $uploadDir = $this->getParameter('gtm_uploads') . "/" . $userId;

        $imageData = $this->uploader->upload($imageBlob, $uploadDir, setUniqueName: true);

        return $imageData;
    }

    private function saveExportedImage(int $userId, UploadedFile $imageBlob, array $imageOperations = [])
    {
        $imageData = $this->uploadExportedImage($userId, $imageBlob);

        $this->imageEntityManager->save(
            [
                'src' => $imageData['path'],
                'originalName' => $imageData['originalName'],
                'operationHash' => Uuid::generate(),
                'operationResults' => $imageOperations,
                'operationType' => GTMImage::OPERATION_EDITION
            ],
            $userId
        );
    }
}