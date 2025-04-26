<?php

namespace App\Controller;

use App\Entity\GTMImage;
use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Compressor\CompressionProcessHandler;
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionProcessState;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageFileValidatorInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;
use App\Service\GraphicsToolsModule\Utils\Uuid;
use App\Service\GraphicsToolsModule\Workflow\Contracts\ImageProcessStateManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route; 
use Symfony\Contracts\Cache\CacheInterface;
use Exception;

#[Route(path: '/profil')]
class GTMCompressorAPIController extends AbstractController
{ 
    public const GET_IMAGE_DATA_URL = '/profil/narzedzia-graficzne/api/pobierz-dane-o-grafice-json';

    public function __construct(
        private readonly GTMLoggerInterface $logger,
        private readonly ImageFileValidatorInterface $imageFileValidator,
        private readonly CacheInterface $cache,
        private readonly CompressionProcessHandler $compressionHandler,
        private readonly ImageProcessStateManagerInterface $processStateManager
    ) {}

    /**
     * Endpoint API uruchamijący process kompresji, który jest podzielony na etapy
     * Zwraca dane o wartości postępu kompresowanej grafiki
     */
    #[Route(path: '/narzedzia-graficzne/api/kompresuj-grafike-json', name: 'gtm_compressor_api_compress_image', methods: ['POST'])]
    public function compressImage(Request $request): JsonResponse
    {
        $image = $request->files->get('image');
        $stepNumber = (int) $request->request->get('stepNumber');
        $processHash = $request->request->get('processHash') ?? (new Uuid())->generate();
        $jsonData = [];
        $status = 200; 

        try {
            if (! $this->getUser()) {
                $status = 403;
                throw new Exception('Odmowa dostępu!');
            }

            if (!$stepNumber) {
                $status = 400;
                throw new Exception('Niepoprawne dane! Brakuje pola stepNumber!');
            }

            if ($stepNumber === 1) { 
                if (!$image) {
                    $status = 400;
                    throw new Exception('Niepoprawne dane! Brak pliku graficznego!');
                }

                $this->imageFileValidator->validate($image);
            } 

            $currentProcessState = $this->getCurrentState($processHash, $image);

            $this->compressionHandler->setState($currentProcessState);

            $processData = match ($stepNumber) {
                1 => $this->compressionHandler->prepare(),
                2 => $this->compressionHandler->process(),
                3 => $this->compressionHandler->finalize(),
                default => throw new \InvalidArgumentException("Błędna wartość kroku w procesie: $stepNumber")
            };

            // Zapisz zaktualizowany stan w cache po każdym kroku
            $this->processStateManager->save($processHash, $currentProcessState);

            $jsonData = [
                'success' => true, 
                'errorMessage' => '', 
                'processData' => $processData->toArray(),
                'processHash' => $processHash // Dodajemy hash procesu do odpowiedzi
            ]; 
            
        } catch (Exception $e) {
            $status = $status === 200 ? 500 : $status;
            $jsonData = [
                'success' => false, 
                'errorMessage' => 'Wystąpił błąd podczas kompresji grafiki', 
                'processData' => [
                    'progress' => 0,
                    'status' => ImageOperationStatus::FAILED,
                    'processHash' => $processHash
                ]
            ];
            $this->logger->error('Wystąpił błąd podczas kompresji grafiki: ' .  $e->getMessage(), [
                'processHash' => $processHash
            ]);
            
            // Czyścimy cache w przypadku błędu
            $this->processStateManager->clear($processHash);
        }

        // Jeśli to ostatni krok lub wystąpił błąd, czyścimy pamięć podręczną
        if ($stepNumber === 3 && $jsonData['processData']['status'] === ImageOperationStatus::COMPLETED) {
            $this->processStateManager->clear($processHash);
        }

        return $this->json($jsonData, $status);
    }

    /** Ostatni etap. Zwraca wyniki kompresji grafiki */
    #[Route(
        path: '/narzedzia-graficzne/api/pobierz-dane-o-grafice-json/{processHash}',
        name: 'gtm_compressor_api_get_compressed_image_data',
        methods: ['GET']
    )]
    public function getCompressedImageData(string $processHash, GTMImageRepository $imageRepository): JsonResponse
    {
        $status = 200;
        $jsonData = [];

        try {
            if (!$this->getUser()) {
                $status = 401;
                throw new Exception('Odmowa dostępu. Użytkownik nie jest zalogowany w systemie');
            }
            /** @var GTMImage */
            $compressedImage = $imageRepository->findOneBy([
                'operationHash' => $processHash,
                'owner' => $this->getUser(),
                'operationType' => GTMImage::OPERATION_COMPRESSION
            ]);

            if (! $compressedImage) {
                $status = 404;
                throw new Exception('Żądana grafika nie istnieje');
            }

            $jsonData = [
                'success' => true,
                'errorMessage' => '',
                'compressedImage' => $compressedImage->getOperationResults(), 
                'processData' => [
                    'progress' => 100,
                    'status' => ImageOperationStatus::COMPLETED
                ]
            ];
            
            // Czyścimy cache po pobraniu danych
            $this->processStateManager->clear($processHash);


        } catch (Exception $e) {
            $jsonData = [
                'success' => false,
                'errorMessage' => $e->getMessage(),
                'compressedImage' => [], 
                'processData' => [
                    'progress' => 0,
                    'status' => ImageOperationStatus::FAILED
                ]
            ];
            $this->logger->error("Wystąpił błąd podczas pobrania grafiki: " . $e->getMessage(), ['processHash' => $processHash]);
        }

        return $this->json($jsonData, $status);
    } 

    private function getCurrentState(string $processHash, ?UploadedFile $image): CompressionProcessState
    {
        $currentProcessState = $this->processStateManager->get($processHash);

        if ($currentProcessState === null) {
            $currentProcessState = new CompressionProcessState(
                $processHash, 
                $this->getUser()->getId(), 
                $this->getParameter('gtm_uploads_compressed'),
                $image?->getRealPath(),
                $image?->getMimeType(),
                $image?->getClientOriginalName(),
            );
        }

        return $currentProcessState;
    }
}