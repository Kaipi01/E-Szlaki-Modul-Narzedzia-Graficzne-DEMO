<?php

namespace App\Controller;

use App\Service\GraphicsToolsModule\Converter\ConversionProcessHandler;
use App\Service\GraphicsToolsModule\Converter\DTO\ConversionProcessState;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageFileValidatorInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;
use App\Service\GraphicsToolsModule\Utils\Uuid;
use App\Service\GraphicsToolsModule\Workflow\Contracts\ImageProcessStateManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route; 
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Exception;

#[Route(path: '/profil')]
class GTMConverterAPIController extends AbstractController
{   
    public function __construct(
        private readonly GTMLoggerInterface $logger,
        private readonly ImageFileValidatorInterface $imageFileValidator,
        private readonly ConversionProcessHandler $conversionHandler,
        private readonly ImageProcessStateManagerInterface $processStateManager
    ) {}

    /**
     * Endpoint API uruchamijący process konwersji, który jest podzielony na etapy
     * Zwraca dane o wartości postępu operacji
     */
    #[Route(path: '/narzedzia-graficzne/api/konwertuj-grafike-json', name: 'gtm_converter_api_convert_image', methods: ['POST'])]
    public function convertImage(Request $request): JsonResponse
    {
        $image = $request->files->get('image');
        $stepNumber = (int) $request->request->get('stepNumber');
        $toFormat = $request->request->get('toFormat');
        $quality = (int) ($request->request->get('quality') ?? 100);
        $processHash = $request->request->get('processHash') ?? (new Uuid())->generate();
        $jsonData = [];
        $status = 200;

        try {
            if (!$this->getUser()) {
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

                if (! $toFormat) {
                    $status = 400;
                    throw new Exception('Niepoprawne dane! Nie podano docelowego formatu!');
                }

                $this->imageFileValidator->validate($image);
            } 

            $currentProcessState = $this->getCurrentState($processHash, $toFormat, $quality, $image);

            $this->conversionHandler->setState($currentProcessState);

            $processData = match ($stepNumber) {
                1 => $this->conversionHandler->prepare(),
                2 => $this->conversionHandler->process(),
                3 => $this->conversionHandler->finalize(),
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
                'errorMessage' => $e->getMessage(), 
                'processData' => [
                    'progress' => 0,
                    'status' => ImageOperationStatus::FAILED,
                    'processHash' => $processHash
                ]
            ];
            
            $this->processStateManager->clear($processHash);
        }

        if ($stepNumber === 3 && $jsonData['processData']['status'] === ImageOperationStatus::COMPLETED) {
            $this->processStateManager->clear($processHash);
        }

        return $this->json($jsonData, $status);
    } 

    private function getCurrentState(string $processHash, ?string $toFormat = null, int $quality = 100, ?UploadedFile $image): ConversionProcessState
    {
        $currentProcessState = $this->processStateManager->get($processHash);

        if ($currentProcessState === null) {

            $currentProcessState = new ConversionProcessState(
                $processHash, 
                $this->getUser()->getId(), 
                $this->getParameter('gtm_uploads_converted'),
                $toFormat,
                $quality,
                $image?->getRealPath(),
                $image?->getMimeType(),
                $image?->getClientOriginalName(),
            );
        }

        return $currentProcessState;
    }
}