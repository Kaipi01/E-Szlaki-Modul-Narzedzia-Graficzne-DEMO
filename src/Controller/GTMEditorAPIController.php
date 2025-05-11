<?php

namespace App\Controller;

use App\Entity\GTMImage;
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

#[Route(path: '/profil')]
class GTMEditorAPIController extends AbstractController
{
    public function __construct(
        private readonly GTMLoggerInterface $logger,
        private readonly UploadImageServiceInterface $uploader,
        private readonly ImageEntityManagerInterface $imageEntityManager,
    ) {
    }

    #[Route(path: '/narzedzia-graficzne/api/edytor-eksportuj-grafike-json', name: 'gtm_editor_api_export_image', methods: ['POST'])]
    public function exportImage(Request $request): JsonResponse
    {
        /** @var UploadedFile */
        $imageBlob = $request->files->get('imageBlob');
        $toFormat = $request->request->get('toFormat');
        $status = 200;

        try {
            if (!$this->getUser()) {
                $status = 403;
                throw new Exception('Odmowa dostępu!');
            }

            if (!$imageBlob) {
                $status = 400;
                throw new Exception('Niepoprawne dane! Brakuje danych o grafice!');
            }

            if (!$toFormat) {
                $status = 400;
                throw new Exception('Niepoprawne dane! Brakuje docelowego formatu!');
            }

            $uploadDir = $this->getParameter('gtm_uploads') . "/" . $this->getUser()->getId();
            $imageData = $this->uploader->upload($imageBlob, $uploadDir, setUniqueName: true);

            $this->imageEntityManager->save(
                [
                    'src' => $imageData['path'],
                    'originalName' => $imageData['originalName'],
                    'operationHash' => Uuid::generate(),
                    'operationResults' => [],
                    'operationType' => GTMImage::OPERATION_EDITION
                ],
                $this->getUser()->getId()
            );

            if (!file_exists($imageData['path'])) {
                throw new Exception('Plik nie istnieje.');
            }

            $jsonData = ['success' => true, 'errorMessage' => ''];

        } catch (Exception $e) {
            $status = $status === 200 ? 500 : $status;
            $jsonData = ['success' => false, 'errorMessage' => 'Wystąpił błąd: ' . $e->getMessage()];

            $this->logger->error(self::class . '::compressImage: ' . $e->getMessage());
        }

        return $this->json($jsonData, $status);
    }
}