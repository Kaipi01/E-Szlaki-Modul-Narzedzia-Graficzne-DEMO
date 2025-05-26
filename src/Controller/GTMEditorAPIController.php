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
use Symfony\Component\HttpFoundation\Response;

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
        $imageChanges = json_decode($request->request->get('imageChanges'), true);
        $status = Response::HTTP_OK;

        try {
            if (!$this->getUser()) {
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

            $uploadDir = $this->getParameter('gtm_uploads') . "/" . $this->getUser()->getId();
            $imageData = $this->uploader->upload($imageBlob, $uploadDir, setUniqueName: true);

            $this->imageEntityManager->save(
                [
                    'src' => $imageData['path'],
                    'originalName' => $imageData['originalName'],
                    'operationHash' => Uuid::generate(),
                    'operationResults' => $imageChanges ?? [],
                    'operationType' => GTMImage::OPERATION_EDITION
                ],
                $this->getUser()->getId()
            );

            if (!file_exists($imageData['path'])) {
                throw new Exception('Plik nie istnieje.');
            }

            $jsonData = ['success' => true, 'errorMessage' => ''];

        } catch (Exception $e) {
            $status = $status === Response::HTTP_OK ? Response::HTTP_INTERNAL_SERVER_ERROR : $status;
            $jsonData = ['success' => false, 'errorMessage' => 'Wystąpił błąd: ' . $e->getMessage()];

            $this->logger->error(self::class . '::compressImage: ' . $e->getMessage());
        }

        return $this->json($jsonData, $status);
    }
}