<?php

namespace App\Service\GraphicsToolsModule;

use App\Repository\GTMCompressionJobRepository;
use App\Service\GraphicsToolsModule\Contracts\ImageOptimizerInterface;
use App\Service\GraphicsToolsModule\Contracts\ImagesCompressorInterface;
use App\Service\GraphicsToolsModule\Contracts\UploadImageServiceInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Psr\Log\LoggerInterface;

class ImagesCompressorService implements ImagesCompressorInterface
{
    private string $uploadDir;

    public function __construct(
        private LoggerInterface $logger,
        private UploadImageServiceInterface $uploadService, 
        private ImageOptimizerInterface $optimizer, 
        private GTMCompressionJobRepository $jobRepository,
        private string $projectDir
    ) {
        $this->uploadDir = "{$this->projectDir}/public/graphics-tools-module/uploads/temp/";
    }

    // public function handle(Request $request, string $projectDir): array
    // {
    //     $compressedImages = [];

    //     foreach ($request->files->all() as $key => $file) {
    //         if ($file instanceof UploadedFile) {
    //             $compressedImages[] = $this->compressImage($file);
    //         }
    //     }

    //     return $compressedImages;
    // }

    public function compressImage(UploadedFile $image): array
    {
        // Wybierz odpowiedni format w zależności od typu pliku
        $mimeType = $image->getMimeType();
        $originalName = $image->getClientOriginalName();
        $newImageName = $this->uploadService->upload($image, $this->uploadDir, true);

        // Ścieżka do pliku względem katalogu publicznego 
        $originalPath = "{$this->uploadDir}/$newImageName";
        $compressedPath = "graphics-tools-module/uploads/compressed/$newImageName";
        $absoluteCompressedPath = "{$this->projectDir}/public/$compressedPath";
 
        $this->uploadService->ensureDirectoryExists($this->projectDir . '/public/graphics-tools-module/uploads/compressed');
 
        try {
            // Kopiowanie pliku do nowej lokalizacji
            copy($originalPath, $absoluteCompressedPath);
 
            $this->optimizer->optimize($mimeType, $absoluteCompressedPath);
 
            $originalSize = filesize($originalPath); 
            $compressedSize = file_exists($absoluteCompressedPath) ? filesize($absoluteCompressedPath) : 0;

        } catch (\Exception $e) { 
            $this->logger->error($e->getMessage());

            return [
                'originalName' => $originalName,
                'error' => $e->getMessage()
            ];
        }

        return [
            'originalName' => $originalName,
            'originalSize' => $originalSize,
            'compressedSize' => $compressedSize,
            'compressionRatio' => $originalSize > 0 ? round((1 - ($compressedSize / $originalSize)) * 100, 2) : 0,
            'imageDownloadURL' => '/' . $compressedPath,
            'mimeType' => $mimeType
        ];
    } 

    public function saveUploadedFiles(Request $request): array
    {
        $fileInfos = [];

        foreach ($request->files->all() as $key => $file) {
            if ($file instanceof UploadedFile) {
                $originalName = $file->getClientOriginalName();
                $mimeType = $file->getMimeType();
                $size = $file->getSize();
                $newImageName = $this->uploadService->upload($file, $this->uploadDir, true);
                
                $fileInfos[] = [
                    'originalName' => $originalName,
                    'savedName' => $newImageName,
                    'mimeType' => $mimeType,
                    'size' => $size,
                    'tempPath' => "{$this->uploadDir}/{$newImageName}"
                ];
            }
        }

        return $fileInfos;
    }

    public function processCompressionJob(int $jobId): void
    {
        $job = $this->jobRepository->find($jobId);
        
        if (!$job) {
            $this->logger->error('Zadanie kompresji nie istnieje', ['jobId' => $jobId]);
            return;
        }
        
        try {
            $job->setStatus('processing');
            $this->jobRepository->save($job);
            
            $files = $job->getFiles();
            $totalFiles = count($files);
            $processedFiles = 0;
            
            foreach ($files as $fileInfo) {
                // Aktualizacja postępu
                $progress = (int) (($processedFiles / $totalFiles) * 100);
                $job->setProgress($progress);
                $this->jobRepository->save($job);
                
                // Kompresja obrazu
                $result = $this->compressImage($fileInfo);
                $job->addResult($result);
                $this->jobRepository->save($job);
                
                $processedFiles++;
            }
            
            // Zakończenie zadania
            $job->setStatus('completed');
            $job->setProgress(100);
            $job->setCompletedAt(new \DateTime());
            $this->jobRepository->save($job);
            
        } catch (\Exception $e) {
            $job->setStatus('failed');
            $job->setError($e->getMessage());
            $this->jobRepository->save($job);
            
            $this->logger->error('Błąd podczas przetwarzania zadania kompresji', [
                'jobId' => $jobId,
                'error' => $e->getMessage()
            ]);
        }
    }
}
