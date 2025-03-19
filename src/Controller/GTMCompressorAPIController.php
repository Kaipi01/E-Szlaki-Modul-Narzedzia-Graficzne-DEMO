<?php

namespace App\Controller;

use App\Entity\GTMImage;
use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressionProcessDispatcherInterface;
use App\Service\GraphicsToolsModule\Utils\Uuid;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/profil')]
class GTMCompressorAPIController extends AbstractController
{
    public const GET_IMAGE_DATA_URL = '/profil/narzedzia-graficzne/api/pobierz-dane-o-grafice-json';

    public function __construct(private CompressionProcessDispatcherInterface $compressionProcess) {}

    /**
     * Endpoint API uruchamijący asynchroniczny process kompresji grafiki w tle
     * Zwraca identyfikator kompresowanej grafiki w celu pobrania jej kiedy będzie gotowa
     */
    #[Route(
        '/narzedzia-graficzne/api/kompresuj-grafike-json',
        name: 'gtm_compressor_api_compress_image',
        methods: ['POST']
    )]
    public function compressImage(Request $request): JsonResponse
    {
        $jsonData = [];
        $status = 200;

        try {
            $image = $request->files->get('image');
            $processId = Uuid::generate();
            $user = $this->getUser();

            if (! $user) {
                $status = 403;
                throw new Exception('Odmowa dostępu!');
            }
            if (! $image) {
                $status = 400;
                throw new Exception('Nie przesłano żadnej grafiki!');
            }
            // Uruchom process kompresji grafiki w tle
            $this->compressionProcess->dispatch($processId, $image);

            $jsonData = [
                'success' => true,
                'errorMessage' => '',
                'processId' => $processId
            ];
        } catch (Exception $e) {
            $status = $status === 200 ? 500 : $status;
            $jsonData = [
                'success' => false,
                'errorMessage' => $e->getMessage(),
                'processId' => null
            ];
        }

        return $this->json($jsonData, $status);
    }


    #[Route(
        '/narzedzia-graficzne/api/pobierz-skompresowana-grafike/{imageName}',
        name: 'gtm_compressor_api_download_compressed_image',
        methods: ['GET']
    )]
    public function downloadCompressedImage(string $imageName): Response
    {
        $plainTextHeader = ["Content-Type" => "text/plain"];

        // Zabezpieczenie przed wprowadzeniem ../ w nazwie pliku
        if (str_contains($imageName, '..')) {
            return new Response('Nieprawidłowa nazwa pliku.', 400, $plainTextHeader);
        }

        $imagePath = $this->getParameter('kernel.project_dir') . "/public/graphics-tools-module/uploads/compressed/$imageName";

        if (!$this->getUser()) {
            return new Response('Odmowa dostępu. Użytkownik nie jest zalogowany w systemie', 401, $plainTextHeader);
        }

        if (!file_exists($imagePath)) {
            return new Response('Grafika nie istnieje.', 404, $plainTextHeader);
        }

        return $this->file($imagePath);
    }


    // #[Route(
    //     '/narzedzia-graficzne/api/pobierz-skompresowana-grafike/{imageName}',
    //     name: 'gtm_compressor_api_download_compressed_image',
    //     methods: ['GET']
    // )]
    // public function downloadCompressedImage(string $imageName): Response
    // {
    //     $status = 500;
    //     $imagePath = $this->getParameter('kernel.project_dir') . "/public/graphics-tools-module/uploads/compressed/$imageName";

    //     try {
    //         if (! $this->getUser()) {
    //             $status = 401;
    //             throw new Exception('Odmowa dostępu. Użytkownik nie jest zalogowany w systemie');
    //         } 
    //         if (!file_exists($imagePath)) {
    //             $status = 404;
    //             throw $this->createNotFoundException('Grafika nie istnieje.');
    //         } 

    //         $binaryResponse = $this->file($imagePath);
    //         $binaryResponse->setStatusCode(200);

    //         return $binaryResponse;

    //     } catch(Exception $e) {
    //         return new Response($e->getMessage(), $status, [
    //            "Content-Type" => "text/plain" 
    //         ]);
    //     } 
    // }

    #[Route(
        '/narzedzia-graficzne/api/pobierz-dane-o-grafice-json/{processId}',
        name: 'gtm_compressor_api_get_compressed_image_data',
        methods: ['GET']
    )]
    public function getCompressedImageData(string $processId, GTMImageRepository $imageRepository): JsonResponse
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
                'operationId' => $processId,
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
