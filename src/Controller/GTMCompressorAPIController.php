<?php

namespace App\Controller;

use App\Entity\GTMImage;
use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageProcessDispatcherInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Exception;

#[Route(path: '/profil')]
class GTMCompressorAPIController extends AbstractController
{
    public const GET_IMAGE_DATA_URL = '/profil/narzedzia-graficzne/api/pobierz-dane-o-grafice-json';

    public function __construct(private ImageProcessDispatcherInterface $imageProcess) {}

    /**
     * Endpoint API uruchamijący asynchroniczny process kompresji grafiki w tle
     * Zwraca identyfikator kompresowanej grafiki w celu pobrania jej kiedy będzie gotowa
     */
    #[Route(
        path: '/narzedzia-graficzne/api/kompresuj-grafike-json',
        name: 'gtm_compressor_api_compress_image',
        methods: ['POST']
    )]
    public function compressImage(Request $request): JsonResponse
    {
        $jsonData = [];
        $status = 200;

        try {
            $image = $request->files->get('image');
            $processHash = $request->request->get('processHash');
            $user = $this->getUser();

            if (! $user) {
                $status = 403;
                throw new Exception('Odmowa dostępu!');
            }

            if (! $processHash || ! $image) {
                $status = 400;
                throw new Exception('Nie poprawne dane! Brakuje danych w polach "processHash" lub "image"');
            }

            // Uruchom process kompresji grafiki 
            $this->imageProcess->dispatch($processHash, $user->getId(), $image, GTMImage::OPERATION_COMPRESSION);

            $jsonData = ['success' => true, 'errorMessage' => ''];
        } catch (Exception $e) {
            $status = $status === 200 ? 500 : $status;
            $jsonData = ['success' => false, 'errorMessage' => $e->getMessage()];
        }

        return $this->json($jsonData, $status);
    }

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
            if (! $this->getUser()) {
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
                'compressedImage' => $compressedImage->getOperationResults()
            ];
        } catch (Exception $e) {
            $jsonData = [
                'success' => false,
                'errorMessage' => $e->getMessage(),
                'compressedImage' => []
            ];
        }

        return $this->json($jsonData, $status);
    }
}
