<?php

namespace App\Service\GraphicsToolsModule;
 
use App\Service\GraphicsToolsModule\Contracts\ImageOptimizerInterface;
use App\Service\GraphicsToolsModule\Contracts\ImagesCompressorInterface;
use App\Service\GraphicsToolsModule\Contracts\UploadImageServiceInterface;
use Doctrine\ORM\EntityManagerInterface;
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
        private EntityManagerInterface $entityManager, 
        private string $projectDir
    ) {
        $this->uploadDir = "{$this->projectDir}/public/graphics-tools-module/uploads/temp/";
    }


    public function handle(Request $request, string $projectDir): array
    {
        $compressedImages = [];

        foreach ($request->files->all() as $key => $file) {
            if ($file instanceof UploadedFile) {
                $compressedImages[] = $this->compressImage($file);
            }
        }

        return $compressedImages;
    }

    public function compressImage(UploadedFile $image): array
    {
        $mimeType = $image->getMimeType();
        $originalName = $image->getClientOriginalName();
        $newImageName = $this->uploadService->upload($image, $this->uploadDir, true);
        $originalPath = "{$this->uploadDir}/$newImageName";
        $compressedPath = "graphics-tools-module/uploads/compressed/$newImageName";
        $absoluteCompressedPath = "{$this->projectDir}/public/$compressedPath";

        $this->uploadService->ensureDirectoryExists("{$this->projectDir}/public/graphics-tools-module/uploads/compressed");

        try {
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
            'imageDownloadURL' => "/$compressedPath",
            'mimeType' => $mimeType
        ];
    }

}







// public function processCompressionJob(int $jobId): void
// {
//     $job = $this->jobRepository->find($jobId);

//     dump($job);

//     if (!$job) {
//         $this->logger->error('Zadanie kompresji nie istnieje', ['jobId' => $jobId]);
//         return;
//     }

//     try {
//         // Rozpoczęcie przetwarzania
//         $job->setStatus('processing');

//         // Zakładamy, że etap "upload" (20%) został już zakończony przez frontend
//         // Zaczynamy więc od 20%
//         $job->setProgress(20);
//         // $this->jobRepository->save($job, true);
//         $this->entityManager->persist($job);

//         dump($job);

//         $files = $job->getFiles();
//         $totalFiles = count($files);
//         $results = [];

//         foreach ($files as $index => $fileInfo) {
//             // Przetwarzanie pliku z raportowaniem postępu na podstawie etapów
//             $result = $this->processFileFromInfoWithStages($fileInfo, $job);
//             $results[] = $result;

//             // Zapisz wyniki po każdym przetworzonym pliku
//             $job->setResults($results);
//             // $this->jobRepository->save($job, true);
//             $this->entityManager->persist($job);
//             $this->entityManager->flush();
//         }

//         // Zakończenie zadania
//         $job->setStatus('completed');
//         $job->setProgress(100);
//         $job->setCompletedAt(new \DateTime());
//         // $this->jobRepository->save($job, true);
//         $this->entityManager->persist($job);
//     } catch (\Exception $e) {
//         $job->setStatus('failed');
//         $job->setError($e->getMessage());
//         // $this->jobRepository->save($job, true);
//         $this->entityManager->persist($job);

//         $this->logger->error('Błąd podczas przetwarzania zadania kompresji', [
//             'jobId' => $jobId,
//             'error' => $e->getMessage()
//         ]);
//     } finally {
//         $this->entityManager->flush();
//     }
// }

// /** Przetwarza plik z raportowaniem postępu na podstawie etapów */
// private function processFileFromInfoWithStages(array $fileInfo, $job): array
// { 
//     if (!isset($fileInfo['tempPath']) || !isset($fileInfo['originalName']) || !isset($fileInfo['mimeType'])) {
//         throw new \InvalidArgumentException('Brak wymaganych informacji o pliku');
//     }

//     $tempPath = $fileInfo['tempPath'];
//     $originalName = $fileInfo['originalName'];
//     $mimeType = $fileInfo['mimeType'];
//     $file = new UploadedFile($tempPath, $originalName, $mimeType);

//     // Generuj unikalną nazwę dla pliku lub użyj istniejącej
//     $newImageName = $fileInfo['savedName'] ?? $this->uploadService->getSaveImageName($file);

//     // Ścieżki do plików
//     $compressedPath = "graphics-tools-module/uploads/compressed/{$newImageName}";
//     $absoluteCompressedPath = "{$this->projectDir}/public/{$compressedPath}";

//     try {
//         // Etap 1: Kopiowanie pliku (20%)
//         $this->logger->debug('Rozpoczęcie kopiowania pliku', ['file' => $originalName]);

//         // Upewnij się, że katalog docelowy istnieje
//         $this->uploadService->ensureDirectoryExists("{$this->projectDir}/public/graphics-tools-module/uploads/compressed");

//         // Kopiuj plik
//         copy($tempPath, $absoluteCompressedPath);

//         // Aktualizacja postępu: upload (20%) + copy (20%) = 40%
//         $this->updateJobProgress($job, 40);
//         $this->logger->debug('Zakończenie kopiowania pliku', ['file' => $originalName]);

//         // Etap 2: Kompresja pliku (50%)
//         $this->logger->debug('Rozpoczęcie kompresji pliku', ['file' => $originalName]);

//         // Optymalizuj obraz
//         $this->optimizer->optimize($mimeType, $absoluteCompressedPath);

//         // Aktualizacja postępu: upload (20%) + copy (20%) + compress (50%) = 90%
//         $this->updateJobProgress($job, 90);
//         $this->logger->debug('Zakończenie kompresji pliku', ['file' => $originalName]);

//         // Etap 3: Finalizacja (10%)
//         $this->logger->debug('Rozpoczęcie finalizacji', ['file' => $originalName]);

//         // Oblicz rozmiary
//         $originalSize = filesize($tempPath);
//         $compressedSize = file_exists($absoluteCompressedPath) ? filesize($absoluteCompressedPath) : 0;

//         $result = [
//             'originalName' => $originalName,
//             'originalSize' => $originalSize,
//             'compressedSize' => $compressedSize,
//             'compressionRatio' => $originalSize > 0 ? round((1 - ($compressedSize / $originalSize)) * 100, 2) : 0,
//             'imageDownloadURL' => "/{$compressedPath}",
//             'mimeType' => $mimeType
//         ];

//         // Aktualizacja postępu: upload (20%) + copy (20%) + compress (50%) + finalize (10%) = 100%
//         $this->updateJobProgress($job, 100);
//         $this->logger->debug('Zakończenie finalizacji', ['file' => $originalName]);

//         return $result;
//     } catch (\Exception $e) {
//         $this->logger->error('Błąd podczas przetwarzania pliku', [
//             'file' => $originalName,
//             'error' => $e->getMessage()
//         ]);

//         return [
//             'originalName' => $originalName,
//             'error' => $e->getMessage()
//         ];
//     }
// }

// /** Aktualizuje postęp zadania */
// private function updateJobProgress($job, int $progress): void
// {
//     $job->setProgress($progress);
//     // $this->jobRepository->save($job, true);
//     $this->entityManager->persist($job);
//     $this->entityManager->flush();
// }