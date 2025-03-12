<?php

namespace App\Controller;
 
use App\Service\GraphicsToolsModule\ImagesCompressorService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/profil')]
class GTMCompressorAPIController extends AbstractController
{
    public function __construct( 
        private ImagesCompressorService $compressor, 
    ) {}


    #[Route('/narzedzia-graficzne/api/kompresuj-grafiki-json', name: 'gtm_compressor_api_compress_images', methods: ['POST'])]
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
