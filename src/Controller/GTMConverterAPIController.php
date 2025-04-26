<?php

namespace App\Controller;

use App\Entity\GTMImage;
use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\Compressor\ConversionProcessHandler;
use App\Service\GraphicsToolsModule\Converter\Contracts\ConverterInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageFileValidatorInterface;
use App\Service\GraphicsToolsModule\Workflow\DTO\ImageOperationStatus;
use App\Service\GraphicsToolsModule\Utils\Uuid;
use App\Service\GraphicsToolsModule\Workflow\Contracts\ImageProcessStateManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route; 
use Symfony\Contracts\Cache\CacheInterface;
use Exception;

#[Route(path: '/profil')]
class GTMConverterAPIController extends AbstractController
{
    private const CACHE_EXPIRATION = 300; // 5 minut
    public const GET_IMAGE_DATA_URL = '/profil/narzedzia-graficzne/api/pobierz-dane-o-grafice-json';

    public function __construct(
        private GTMLoggerInterface $logger,
        private ConverterInterface $converter, 
        private ImageEntityManagerInterface $imageManager,
        private ImageFileValidatorInterface $imageFileValidator,
        private CacheInterface $cache,
        private ConversionProcessHandler $conversionProcessHandler,
        private ImageProcessStateManagerInterface $processStateManager
    ) {}

    /**
     * Endpoint API uruchamijący process konwersji, który jest podzielony na etapy
     * Zwraca dane o wartości postępu operacji
     */
    #[Route(path: '/narzedzia-graficzne/api/konvertuj-grafike-json', name: 'gtm_converter_api_convert_image', methods: ['POST'])]
    public function convertImage(Request $request): JsonResponse
    {
        $image = $request->files->get('image');
        $stepNumber = (int) $request->request->get('stepNumber');
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

                $this->imageFileValidator->validate($image);
            }

            $conversionProcess = $this->getConversionHandler($processHash, $image);

            $processData = match ($stepNumber) {
                1 => $conversionProcess->prepareImage(),
                2 => $conversionProcess->convertImage(),
                3 => $conversionProcess->saveImage(),
                default => throw new \InvalidArgumentException("Błędna wartość kroku w procesie: $stepNumber")
            };

            // Zapisz zaktualizowany handler w cache po każdym kroku
            $this->saveConversionHandler($processHash, $conversionProcess);

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
                'errorMessage' => $e->getMessage(), 
                'processData' => [
                    'progress' => 0,
                    'status' => ImageOperationStatus::FAILED,
                    'processHash' => $processHash
                ]
            ];
            
            // Czyścimy cache w przypadku błędu
            $this->clearConversionHandler($processHash);
        }

        // Jeśli to ostatni krok lub wystąpił błąd, czyścimy pamięć podręczną
        if ($stepNumber === 3 && $jsonData['processData']['status'] === ImageOperationStatus::COMPLETED) {
            $this->clearConversionHandler($processHash);
        }

        return $this->json($jsonData, $status);
    }

    /** Ostatni etap. Zwraca wyniki kompresji grafiki */
    #[Route(
        path: '/narzedzia-graficzne/api/pobierz-dane-o-grafice-json/{processHash}',
        name: 'gtm_converter_api_get_converted_image_data',
        methods: ['GET']
    )]
    public function getConvertedImageData(string $processHash, GTMImageRepository $imageRepository): JsonResponse
    {
        $status = 200;
        $jsonData = [];

        try {
            if (!$this->getUser()) {
                $status = 401;
                throw new Exception('Odmowa dostępu. Użytkownik nie jest zalogowany w systemie');
            }
            /** @var GTMImage */
            $image = $imageRepository->findOneBy([
                'operationHash' => $processHash,
                'owner' => $this->getUser(),
                'operationType' => GTMImage::OPERATION_CONVERSION
            ]);

            if (! $image) {
                $status = 404;
                throw new Exception('Żądana grafika nie istnieje');
            }

            $jsonData = [
                'success' => true,
                'errorMessage' => '',
                'convertedImage' => $image->getOperationResults(), 
                'processData' => [
                    'progress' => 100,
                    'status' => ImageOperationStatus::COMPLETED
                ]
            ];
            
            // Czyścimy cache po pobraniu danych
            $this->clearConversionHandler($processHash);
            
        } catch (Exception $e) {
            $jsonData = [
                'success' => false,
                'errorMessage' => $e->getMessage(),
                'convertedImage' => [], 
                'processData' => [
                    'progress' => 0,
                    'status' => ImageOperationStatus::FAILED
                ]
            ];
        }

        return $this->json($jsonData, $status);
    } 
}