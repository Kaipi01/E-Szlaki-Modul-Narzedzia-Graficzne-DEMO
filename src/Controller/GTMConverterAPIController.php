<?php

namespace App\Controller;

use App\Service\GraphicsToolsModule\Converter\ConversionProcessHandler;
use App\Service\GraphicsToolsModule\Converter\DTO\ConversionProcessState;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageFileValidatorInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\UploadImageServiceInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;
use App\Service\GraphicsToolsModule\Utils\Uuid;
use App\Service\GraphicsToolsModule\Workflow\Contracts\ImageProcessStateManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Exception;
use Symfony\Component\HttpFoundation\Response;

#[Route(path: '/profil')]
class GTMConverterAPIController extends AbstractController
{
    public function __construct(
        private readonly GTMLoggerInterface $logger,
        private readonly ImageFileValidatorInterface $imageFileValidator,
        private readonly ConversionProcessHandler $conversionHandler,
        private readonly ImageProcessStateManagerInterface $processStateManager,
        private readonly UploadImageServiceInterface $fileUploader
    ) {
    }

    /**
     * Endpoint API uruchamijący process konwersji, który jest podzielony na etapy
     * Zwraca dane o wartości postępu operacji
     */
    #[Route(path: '/narzedzia-graficzne/api/konwertuj-grafike-json', name: 'gtm_converter_api_convert_image', methods: ['POST'])]
    public function convertImage(Request $request): JsonResponse
    {
        [$errorStatus, $errorMessage, $requestIsValid, $requestData] = $this->validateRequest($request); 
        $jsonData = [];
        $imageData = [];
        $status = Response::HTTP_OK; 

        try {
            if (! $requestIsValid) {
                $status = $errorStatus;
                throw new Exception($errorMessage);
            }

            if ($requestData['stepNumber'] === 1) {
                $uploadDir = $this->getParameter('gtm_uploads') . "/" . $this->getUser()->getId();
                $imageData = $this->fileUploader->upload($requestData['image'], $uploadDir, setUniqueName: true);
            }

            $currentProcessState = $this->getCurrentState($requestData, $imageData);

            $this->conversionHandler->setState($currentProcessState);

            $processData = match ($requestData['stepNumber']) {
                1 => $this->conversionHandler->prepare(),
                2 => $this->conversionHandler->process(),
                3 => $this->conversionHandler->finalize(),
                default => throw new \InvalidArgumentException("Błędna wartość kroku w procesie: " . $requestData['stepNumber'])
            };

            $this->processStateManager->save($requestData['processHash'], $currentProcessState);

            $jsonData = [
                'success' => true,
                'errorMessage' => '',
                'processData' => $processData->toArray(),
                'processHash' => $requestData['processHash']
            ];

        } catch (Exception $e) {
            $status = $status === Response::HTTP_OK ? Response::HTTP_INTERNAL_SERVER_ERROR : $status;
            $jsonData = [
                'success' => false,
                'errorMessage' => $e->getMessage(),
                'processData' => [
                    'progress' => 0,
                    'status' => ImageOperationStatus::FAILED,
                    'processHash' => $requestData['processHash']
                ]
            ];

            $this->logger->error(self::class . "::convertImage() " . $e->getMessage());

            $this->processStateManager->clear($requestData['processHash']);
        }

        if ($requestData['stepNumber'] === 3 && $jsonData['processData']['status'] === ImageOperationStatus::COMPLETED) {
            $this->processStateManager->clear($requestData['processHash']);
        }

        return $this->json($jsonData, $status);
    }

    private function validateRequest(Request $request): array
    {
        $image = $request->files->get('image');
        $stepNumber = (int) $request->request->get('stepNumber');
        $toFormat = $request->request->get('toFormat');
        $quality = (int) ($request->request->get('quality') ?? 100);
        $addCompress = $request->request->get('addCompress') ?? false;
        $processHash = $request->request->get('processHash') ?? Uuid::generate();
        $errorStatus = 200;
        $errorMessage = '';
        $requestIsValid = true;

        $requestData = [
            'image' => $image,
            'stepNumber' => $stepNumber,
            'toFormat' => $toFormat,
            'quality' => $quality,
            'addCompress' => $addCompress,
            'processHash' => $processHash
        ];

        if (!$this->getUser()) {
            $errorStatus = Response::HTTP_UNAUTHORIZED;
            $errorMessage = 'Odmowa dostępu!';
        }

        if (!$stepNumber) {
            $errorStatus = Response::HTTP_BAD_REQUEST;
            $errorMessage = 'Niepoprawne dane! Brakuje pola stepNumber!';
        }

        if ($stepNumber === 1) {
            if (!$image) {
                $errorStatus = Response::HTTP_BAD_REQUEST;
                $errorMessage = 'Niepoprawne dane! Brak pliku graficznego!';
            }
            if (!$toFormat) {
                $errorStatus = Response::HTTP_BAD_REQUEST;
                $errorMessage = 'Niepoprawne dane! Nie podano docelowego formatu!';
            }
            if ($quality <= 0 || $quality > 100) {
                $errorStatus = Response::HTTP_BAD_REQUEST;
                $errorMessage = 'Nieprawidłowe dane! Jakość musi być od 1 do 100 !';
            } 
        }

        if ($errorStatus != Response::HTTP_OK) {
            $requestIsValid = false;
        } 

        return [$errorStatus, $errorMessage, $requestIsValid, $requestData];
    }

    private function getCurrentState(array $requestData, array $imageData = []): ConversionProcessState
    {
        $state = $this->processStateManager->get($requestData['processHash']); 

        if ($state === null) {

            $state = new ConversionProcessState(
                $requestData['processHash'],
                $this->getUser()->getId(),
                $requestData['toFormat'],
                $requestData['quality'],
                $requestData['addCompress'], 
                $imageData['originalName'],
                $imageData['path']
            );
        }

        return $state;
    }
}