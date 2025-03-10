<?php

namespace App\Controller;

use App\Entity\GTMCompressionJob;
use App\Repository\GTMCompressionJobRepository; 
use App\Service\GraphicsToolsModule\Contracts\CompressionJobDispatcherInterface;
use App\Service\GraphicsToolsModule\Contracts\ImagesCompressorInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class GTMCompressorAPIController extends AbstractController
{
    public function __construct(
        private ImagesCompressorInterface $compressor,
        private GTMCompressionJobRepository $jobRepository,
        private CompressionJobDispatcherInterface $jobDispatcher
    ) {}


    #[Route('/narzedzia-graficzne/api/kompresuj-grafiki-json', name: 'gtm_compressor_api_compress_images', methods: ['POST'])]
    public function compress_images(Request $request): JsonResponse
    {
        $projectDir = $this->getParameter('kernel.project_dir');

        try {
            // Zapisz przesłane pliki tymczasowo
            $fileInfos = $this->compressor->saveUploadedFiles($request, $projectDir);

            if (empty($fileInfos)) {
                return $this->json([
                    'success' => false,
                    'errorMessage' => 'Nie przesłano żadnych plików',
                ], 400);
            }

            // Utwórz nowe zadanie kompresji
            $job = new GTMCompressionJob();
            $job->setStatus('pending');
            $job->setProgress(0);
            $job->setFiles($fileInfos);

            $this->jobRepository->save($job);

            // Uruchom zadanie kompresji w tle
            $this->jobDispatcher->dispatch($job->getId());

            return $this->json([
                'success' => true,
                'jobId' => $job->getId(),
                'message' => 'Zadanie kompresji zostało utworzone'
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'success' => false,
                'errorMessage' => $e->getMessage(),
            ], 500);
        }
    }

    #[Route('/narzedzia-graficzne/api/status-kompresji/{id}', name: 'gtm_compressor_api_get_job_status', methods: ['GET'])]
    public function compress_job_status(int $id): JsonResponse
    {
        $job = $this->jobRepository->find($id);

        if (!$job) {
            return $this->json([
                'success' => false,
                'errorMessage' => 'Zadanie nie istnieje'
            ], 404);
        }

        return $this->json([
            'success' => true,
            'status' => $job->getStatus(),
            'progress' => $job->getProgress(),
            'results' => $job->getResults(),
            'error' => $job->getError(),
            'completed' => $job->getStatus() === 'completed',
        ]);
    }


    // #[
    //     Route(
    //         '/narzedzia-graficzne/kompresuj-grafiki-json',
    //         name: 'app_gtm_compressor_compress_images_post',
    //         methods: ['POST']
    //     )
    // ]
    // public function compress_images(Request $request): JsonResponse
    // {
    //     $projectDir = $this->getParameter('kernel.project_dir');
    //     $jsonData = [];
    //     $status = 200; 

    //     try { 
    //         $jsonData = [
    //             'success' => true,
    //             'errorMessage' => '',
    //             'compressedImages' => $this->compressor->handle($request, $projectDir)
    //         ];

    //     } catch(\Exception $e) { 
    //         $status = 500;
    //         $jsonData = [
    //             'success' => false,
    //             'errorMessage' => $e->getMessage(),
    //             'compressedImages' => []
    //         ]; 
    //     } 

    //     return $this->json($jsonData, $status);
    // }
}
