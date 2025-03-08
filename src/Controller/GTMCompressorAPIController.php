<?php

namespace App\Controller;

use App\Service\GraphicsToolsModule\Contracts\ImagesCompressorInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request; 
use Symfony\Component\Routing\Annotation\Route;

class GTMCompressorAPIController extends AbstractController
{
    public function __construct(private ImagesCompressorInterface $compressor) {}

    #[
        Route(
            '/narzedzia-graficzne/kompresuj-grafiki-json',
            name: 'app_gtm_compressor_compress_images_post',
            methods: ['POST']
        )
    ]
    public function compress_images(Request $request): JsonResponse
    {
        $projectDir = $this->getParameter('kernel.project_dir');
        $jsonData = [];
        $status = 200; 

        try { 
            $jsonData = [
                'success' => true,
                'errorMessage' => '',
                'compressedImages' => $this->compressor->handle($request, $projectDir)
            ];

        } catch(\Exception $e) { 
            $status = 500;
            $jsonData = [
                'success' => false,
                'errorMessage' => $e->getMessage(),
                'compressedImages' => []
            ]; 
        } 

        return $this->json($jsonData, $status);
    }
}
