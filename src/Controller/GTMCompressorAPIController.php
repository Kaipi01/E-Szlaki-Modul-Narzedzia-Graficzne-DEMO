<?php

namespace App\Controller;

use App\Entity\GTMImage;
use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Compressor\CompressionProcessHandler;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageFileValidatorInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageOperationStatus;
use App\Service\GraphicsToolsModule\Utils\Uuid;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route; 
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Exception;

#[Route(path: '/profil')]
class GTMCompressorAPIController extends AbstractController
{
    private const CACHE_EXPIRATION = 300; // 5 minut
    public const GET_IMAGE_DATA_URL = '/profil/narzedzia-graficzne/api/pobierz-dane-o-grafice-json';

    public function __construct(
        private CompressorInterface $compressor, 
        private ImageEntityManagerInterface $imageManager,
        private ImageFileValidatorInterface $imageFileValidator,
        private CacheInterface $cache
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

            $compressionProcess = $this->getCompressionHandler($processHash, $image);

            $processData = match ($stepNumber) {
                1 => $compressionProcess->prepareImage(),
                2 => $compressionProcess->compressImage(),
                3 => $compressionProcess->saveImage(),
                default => throw new \InvalidArgumentException("Błędna wartość kroku w procesie: $stepNumber")
            };

            // Zapisz zaktualizowany handler w cache po każdym kroku
            $this->saveCompressionHandler($processHash, $compressionProcess);

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
            $this->clearCompressionHandler($processHash);
        }

        // Jeśli to ostatni krok lub wystąpił błąd, czyścimy pamięć podręczną
        if ($stepNumber === 3 && $jsonData['processData']['status'] === ImageOperationStatus::COMPLETED) {
            $this->clearCompressionHandler($processHash);
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

            if (!$compressedImage) {
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
            $this->clearCompressionHandler($processHash);
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
        }

        return $this->json($jsonData, $status);
    }

    /** Zapisuje obiekt CompressionProcessHandler w cache */
    private function saveCompressionHandler(string $processHash, CompressionProcessHandler $handler): void
    {
        $cacheKey = "compression_handler_{$processHash}";
        $this->cache->delete($cacheKey); // Usuń stary wpis, jeśli istnieje
        
        $this->cache->get($cacheKey, function (ItemInterface $item) use ($handler) {
            $item->expiresAfter(self::CACHE_EXPIRATION);
            return serialize($handler);
        });
    }

    /** Pobiera obiekt CompressionProcessHandler z cache lub tworzy nowy */
    private function getCompressionHandler(string $processHash, ?UploadedFile $image): CompressionProcessHandler
    {
        $cacheKey = "compression_handler_{$processHash}";
        
        // Spróbuj pobrać handler z cache
        $cachedHandler = $this->cache->get($cacheKey, function (ItemInterface $item) {
            $item->expiresAfter(0); // Oznacz jako nieważny, jeśli nie znaleziono
            return null;
        });
        
        if ($cachedHandler !== null) {
            try {
                // Deserializuj handler
                $handler = unserialize($cachedHandler);
                
                // Wstrzyknij zależności 
                $handler->injectDependencies(
                    $this->compressor,
                    $this->imageManager,
                    $this->getParameter('gtm_uploads_compressed'),
                    $this->getUser()->getId()
                );
                
                return $handler;
            } catch (Exception $e) {
                // Jeśli wystąpił błąd podczas deserializacji, usuń wpis z cache
                $this->cache->delete($cacheKey);
                // Log błędu
                error_log("Błąd deserializacji handlera: " . $e->getMessage());
            }
        }
        
        // Jeśli nie ma w cache lub wystąpił błąd, utwórz nowy
        $handler = new CompressionProcessHandler([
            'processHash' => $processHash,
            'image' => $image,
            'compressor' => $this->compressor,
            'imageManager' => $this->imageManager,
            'compressedDir' => $this->getParameter('gtm_uploads_compressed'),
            'ownerId' => $this->getUser()->getId()
        ]);
        
        // Zapisz nowy handler w cache
        $this->saveCompressionHandler($processHash, $handler);
        
        return $handler;
    }

    /** Czyści obiekt CompressionProcessHandler z cache */
    private function clearCompressionHandler(string $processHash): void
    {
        $cacheKey = "compression_handler_{$processHash}";
        $this->cache->delete($cacheKey);
    }
}