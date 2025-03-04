<?php

namespace App\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class GTMCompressorAPIController extends AbstractController
{
    public function __construct(private EntityManagerInterface $em) {}

    #[Route(
        '/narzedzia-graficzne/kompresor/pobierz-ustawienia-json',
        name: 'app_gtm_compressor_get_settings_json',
        methods: ['GET']
    )]
    public function get_settings_json(): JsonResponse
    {
        return $this->json([
            "uploadUrl" => '/api/compress-images',
            "maxFileSize" => 15 * 1024 * 1024, // 15MB 
            "allowedTypes" => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
            "maxConcurrentUploads" => 3
        ]);
    }

    #[Route('/narzedzia-graficzne/kompresuj-grafiki-json', name: 'app_gtm_compressor_compress_images_post', methods: ['POST'])]
    public function compress_images(): JsonResponse
    {
        return $this->json([]);
    }
}
