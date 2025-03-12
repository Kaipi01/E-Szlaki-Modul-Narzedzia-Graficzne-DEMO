<?php

namespace App\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use App\Service\GraphicsToolsModule\Contracts\ImageOptimizerInterface;
use Psr\Log\LoggerInterface;

class GTMCompressImageCommand extends Command
{ 
    protected static $defaultName = 'gtm:compress-image';
    protected static $defaultDescription = 'Kompresuje obraz i śledzi postęp procesu';

    private string $progressDir;

    public function __construct(
        private ImageOptimizerInterface $optimizer,
        private LoggerInterface $logger,
        private string $projectDir
    ) {
        parent::__construct();
        
        $this->progressDir = "{$this->projectDir}/var/compression-progress/";
        
        // Upewnij się, że katalog istnieje
        if (!is_dir($this->progressDir)) {
            mkdir($this->progressDir, 0755, true);
        }
    }

    protected function configure(): void
    {
        $this
            ->addArgument('jobId', InputArgument::REQUIRED, 'Identyfikator zadania kompresji')
            ->addArgument('imagePath', InputArgument::REQUIRED, 'Ścieżka do obrazu do kompresji');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $jobId = $input->getArgument('jobId');
        $imagePath = $input->getArgument('imagePath');
        
        $output->writeln("Rozpoczynam kompresję obrazu dla zadania {$jobId}");
        
        try {
            // Kopiowanie pliku
            $destinationDir = "{$this->projectDir}/public/graphics-tools-module/uploads/compressed/";
            
            if (!is_dir($destinationDir)) {
                mkdir($destinationDir, 0755, true);
            }
            
            $filename = basename($imagePath);
            $destinationPath = $destinationDir . $filename;
            
            $output->writeln("Kopiowanie pliku...");
            copy($imagePath, $destinationPath);
            
            // Aktualizacja postępu - 40%
            $this->updateProgress($jobId, 40, 'copied');
            
            $output->writeln("Kompresja obrazu...");
            // Kompresja obrazu
            $this->optimizer->optimize(mime_content_type($destinationPath), $destinationPath);
            
            // Aktualizacja postępu - 90%
            $this->updateProgress($jobId, 90, 'compressed');
            
            // Obliczenie wyników
            $originalSize = filesize($imagePath);
            $compressedSize = filesize($destinationPath);
            $compressionRatio = $originalSize > 0 ? round((1 - ($compressedSize / $originalSize)) * 100, 2) : 0;
            
            $output->writeln("Finalizacja...");
            // Finalizacja - 100%
            $this->updateProgress($jobId, 100, 'completed', [
                'result' => [
                    'originalName' => $filename,
                    'originalSize' => $originalSize,
                    'compressedSize' => $compressedSize,
                    'compressionRatio' => $compressionRatio,
                    'imageDownloadURL' => "/graphics-tools-module/uploads/compressed/$filename"
                ]
            ]);
            
            $output->writeln("Kompresja zakończona pomyślnie");
            return Command::SUCCESS;
            
        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas kompresji obrazu', [
                'jobId' => $jobId,
                'error' => $e->getMessage()
            ]);
            
            $this->updateProgress($jobId, 0, 'failed', [
                'error' => $e->getMessage()
            ]);
            
            $output->writeln("<error>Błąd: {$e->getMessage()}</error>");
            return Command::FAILURE;
        }
    }
    
    /** Aktualizuje postęp kompresji w pliku */
    private function updateProgress(string $jobId, int $progress, string $status, array $additionalData = []): void
    {
        $data = array_merge([
            'progress' => $progress,
            'status' => $status,
            'updatedAt' => time()
        ], $additionalData);
        
        file_put_contents(
            "{$this->progressDir}$jobId.json",
            json_encode($data)
        );
    }
}

 

// namespace App\Command;
 
// use App\Service\GraphicsToolsModule\Contracts\TrackCompressionProgressInterface;
// use Symfony\Component\Console\Command\Command;
// use Symfony\Component\Console\Input\InputArgument;
// use Symfony\Component\Console\Input\InputInterface;
// use Symfony\Component\Console\Output\OutputInterface;

// class GTMCompressImageCommand extends Command
// {
//     public function __construct(private TrackCompressionProgressInterface $trackCompressionService) {
//         parent::__construct();
//     }

//     protected function configure()
//     {
//         $this
//             ->setName('gtm:compress-image')
//             ->setDescription('Kompresuje obraz i aktualizuje postęp')
//             ->addArgument('imageId', InputArgument::REQUIRED, 'ID obrazu do kompresji')
//             ->addArgument('imagePath', InputArgument::REQUIRED, 'Ścieżka do obrazu');
//     }

//     protected function execute(InputInterface $input, OutputInterface $output): int
//     {
//         $imageId = $input->getArgument('imageId');
//         $imagePath = $input->getArgument('imagePath');

//         // 1. Obraz już został przesłany (30%)
//         $this->trackCompressionService->updateProgress($imageId, 30);

//         // 2. Przeniesienie obrazu i utworzenie kopii (40%)
//         // Tutaj kod do przeniesienia i utworzenia kopii
//         $this->trackCompressionService->updateProgress($imageId, 40);

//         // 3. Kompresja obrazu (90%)
//         // Tutaj kod kompresji obrazu
//         $this->trackCompressionService->updateProgress($imageId, 90);

//         // 4. Finalizacja i przesłanie informacji (100%)
//         // Tutaj kod finalizacji
//         $this->trackCompressionService->updateProgress($imageId, 100);

//         return Command::SUCCESS;
//     }
// }