<?php

namespace App\Controller;

use App\Service\GraphicsToolsModule\Compressor\CompressionProcessHandler;
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionProcessState;
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

#[Route(path: '/profil')]
class GTMCompressorAPIController extends AbstractController
{  
    public function __construct(
        private readonly GTMLoggerInterface $logger,
        private readonly ImageFileValidatorInterface $imageFileValidator,
        private readonly CompressionProcessHandler $compressionHandler,
        private readonly ImageProcessStateManagerInterface $processStateManager,
        private readonly UploadImageServiceInterface $fileUploader    
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
        $imageData = [];
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

                $uploadDir = $this->getParameter('gtm_uploads') . "/" . $this->getUser()->getId();
                $imageData = $this->fileUploader->upload($image, $uploadDir, setUniqueName: true);
            } 

            $currentProcessState = $this->getCurrentState($processHash, $imageData);

            $this->compressionHandler->setState($currentProcessState);

            $processData = match ($stepNumber) {
                1 => $this->compressionHandler->prepare(),
                2 => $this->compressionHandler->process(),
                3 => $this->compressionHandler->finalize(),
                default => throw new \InvalidArgumentException("Błędna wartość kroku w procesie: $stepNumber")
            };

            $this->processStateManager->save($processHash, $currentProcessState);

            $jsonData = [
                'success' => true, 
                'errorMessage' => '', 
                'processData' => $processData->toArray(),
                'processHash' => $processHash
            ]; 
            
        } catch (Exception $e) {
            $status = $status === 200 ? 500 : $status;
            $jsonData = [
                'success' => false, 
                'errorMessage' => 'Wystąpił błąd podczas kompresji grafiki: ' .  $e->getMessage(), 
                'processData' => [
                    'progress' => 0,
                    'status' => ImageOperationStatus::FAILED,
                    'processHash' => $processHash
                ]
            ];
            $this->logger->error(self::class . '::compressImage: ' .  $e->getMessage(), [
                'processHash' => $processHash
            ]);
            
            $this->processStateManager->clear($processHash);
        }

        if ($stepNumber === 3 && $jsonData['processData']['status'] === ImageOperationStatus::COMPLETED) {
            $this->processStateManager->clear($processHash);
        }

        return $this->json($jsonData, $status);
    } 

    private function getCurrentState(string $processHash, array $imageData): CompressionProcessState
    {
        $state = $this->processStateManager->get($processHash);

        if ($state === null) { 
            $state = new CompressionProcessState(
                $processHash, 
                $this->getUser()->getId(),
                $imageData['originalName'],
                $imageData['path']
            );
        }

        return $state;
    }
}