<?php

namespace App\Controller;

use App\Service\GraphicsToolsModule\Compressor\CompressionProcessHandler;
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionProcessState;
use App\Service\GraphicsToolsModule\Editor\DTO\ResizeImageOptions;
use App\Service\GraphicsToolsModule\UserImages\Contracts\UserStorageInterface;
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
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

#[Route(path: '/profil')]
class GTMCompressorAPIController extends AbstractController
{
    public function __construct(
        private readonly GTMLoggerInterface $logger,
        private readonly ImageFileValidatorInterface $imageFileValidator,
        private readonly CompressionProcessHandler $compressionHandler,
        private readonly ImageProcessStateManagerInterface $processStateManager,
        private readonly UploadImageServiceInterface $fileUploader,
        private readonly UserStorageInterface $storageService
    ) {
    }

    /**
     * Endpoint API uruchamijący process kompresji, który jest podzielony na etapy
     * Zwraca dane o wartości postępu kompresowanej grafiki
     */
    #[Route(path: '/narzedzia-graficzne/api/kompresuj-grafike-json', name: 'gtm_compressor_api_compress_image', methods: ['POST'])]
    public function compressImage(Request $request): JsonResponse
    {
        /**  @var UploadedFile */
        $image = $request->files->get('image');
        $stepNumber = (int) $request->request->get('stepNumber');
        $processHash = $request->request->get('processHash') ?? Uuid::generate();
        $jsonData = [];
        $imageData = [];
        $status = Response::HTTP_OK;
        $user = $this->getUser();

        try {
            if (!$user) {
                $status = Response::HTTP_UNAUTHORIZED;
                throw new Exception('Odmowa dostępu!');
            }

            if (!$stepNumber) {
                $status = Response::HTTP_BAD_REQUEST;
                throw new Exception('Niepoprawne dane! Brakuje pola stepNumber!');
            }

            if ($stepNumber === 1) {
                if (!$image) {
                    $status = Response::HTTP_BAD_REQUEST;
                    throw new Exception('Niepoprawne dane! Brak pliku graficznego!');
                }

                if (!$this->storageService->isUserHaveEnoughSpace($user->getId(), $image->getSize())) {
                    $status = Response::HTTP_BAD_REQUEST;
                    throw new Exception('Brak wolnego miejsca na dysku!');
                }

                $uploadDir = $this->getParameter('gtm_uploads') . "/" . $user->getId();
                $imageData = $this->fileUploader->upload($image, $uploadDir, setUniqueName: true);
                $imageData["options"] = json_decode($request->request->get("options"), true);
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
            $status = $status === Response::HTTP_OK ? Response::HTTP_INTERNAL_SERVER_ERROR : $status;
            $jsonData = [
                'success' => false,
                'errorMessage' => $e->getMessage(),
                'processData' => [
                    'progress' => 0,
                    'status' => ImageOperationStatus::FAILED,
                    'processHash' => $processHash
                ]
            ];
            $this->logger->error(self::class . '::compressImage: ' . $e->getMessage(), [
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
            $options = $imageData['options'] ?? [];
            $resizeOptions = null;

            $this->validateOptions($options);

            if ($options['isChange']) {
                $resizeOptions = new ResizeImageOptions($options["changeBy"], $options["width"], $options["height"], $options["percent"]);
            } 

            $state = new CompressionProcessState(
                $processHash,
                $this->getUser()->getId(),
                $options["strength"],
                $imageData['originalName'],
                $imageData['path'],
                $resizeOptions
            );
        }

        return $state;
    }

    /**
     * Waliduje dane z pola "options" przesłane jako JSON.
     * @param array $options Dane zdekodowane z JSON.
     * @throws \InvalidArgumentException
     */
    private function validateOptions(array $options): void
    {
        $changeByTypes = [ResizeImageOptions::RESIZE_BY_PERCENT, ResizeImageOptions::RESIZE_BY_HEIGHT, ResizeImageOptions::RESIZE_BY_WIDTH];
        $requiredKeys = array_merge(['strength', 'isChange', 'changeBy'], $changeByTypes);

        foreach ($requiredKeys as $key) {
            if (!array_key_exists($key, $options)) {
                throw new \InvalidArgumentException("Brakuje wymaganej właściwości '$key' w options.");
            }
        }

        if (!is_int($options['strength']) || $options['strength'] < 0 || $options['strength'] > 100) {
            throw new \InvalidArgumentException("Wartość 'strength' musi być liczbą całkowitą z zakresu 0–100.");
        }

        if (!is_bool($options['isChange'])) {
            throw new \InvalidArgumentException("Wartość 'isChange' musi być typu boolean.");
        }

        if (!in_array($options['changeBy'], $changeByTypes, true)) {
            throw new \InvalidArgumentException("Wartość 'changeBy' musi być: " . implode(",", $changeByTypes));
        }

        foreach ($changeByTypes as $dim) {
            if ($options[$dim] !== null && !is_int($options[$dim])) {
                throw new \InvalidArgumentException("Wartość '$dim' musi być liczbą całkowitą lub null.");
            }
        }
    }

}