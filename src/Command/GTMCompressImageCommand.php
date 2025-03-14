<?php

namespace App\Command;

use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageOperationStatus;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;   
use Psr\Log\LoggerInterface;  

class GTMCompressImageCommand extends Command
{
    protected static $defaultName = 'gtm:compress-image';
    protected static $defaultDescription = 'Kompresuje obraz i śledzi postęp procesu'; 
    private string $progressDir;

    public function __construct(
        private CompressorInterface $compressor,
        private TrackCompressionProgressInterface $compressionTracker,
        private LoggerInterface $logger,
        private string $projectDir
    ) {
        parent::__construct();

        $this->progressDir = "{$this->projectDir}/var/compression-progress/";

        if (!is_dir($this->progressDir)) {
            mkdir($this->progressDir, 0755, true);
        }
    }

    protected function configure(): void
    {
        $this
            ->addArgument('processId', InputArgument::REQUIRED, 'Identyfikator zadania kompresji')
            ->addArgument('userId', InputArgument::REQUIRED, 'ID Użytkownika')
            ->addArgument('tempPath', InputArgument::REQUIRED, 'Ścieżka do obrazu do kompresji')
            ->addArgument('originalName', InputArgument::REQUIRED, 'Orginalna nazwa grafiki')
            ->addArgument('mimeType', InputArgument::REQUIRED, 'Typ MIME');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {  
        $processId = $input->getArgument('processId');
        $userId = $input->getArgument('userId');
        $tempPath = $input->getArgument('tempPath');
        $originalName = $input->getArgument('originalName');
        $mimeType = $input->getArgument('mimeType');  


        $this->logger->debug('Komenda kompresji grafiki', [
            'processId' => $processId,
            'userId' => $userId,
            'tempPath' => $tempPath,
            'originalName' => $originalName,
            'mimeType' => $mimeType,
        ]); 



        try {
            $this->compressionTracker->updateProgress($processId, 40, ImageOperationStatus::PREPARING);

            $destinationDir = "{$this->projectDir}/public/graphics-tools-module/uploads/compressed/";

            if (!is_dir($destinationDir)) {
                mkdir($destinationDir, 0755, true);
            } 

            $destinationPath = $destinationDir . basename($originalName);  

            // move_uploaded_file($tempPath, $destinationPath);

            copy($tempPath, $destinationPath);
            unlink($tempPath);

            $this->compressionTracker->updateProgress($processId,  80, ImageOperationStatus::PROCESSING);

            $compressionResults = $this->compressor->compress($destinationPath, $mimeType);

            // TODO: Zaimplementuj
            // Dodanie do bazy danych wyniku kompresji
            // $this->imageService->save($compressionResults);

            // $this->compressionTracker->updateProgress($processId,  90, ImageOperationStatus::PROCESSING);

            $output->writeln("Kompresja zakończona pomyślnie");

            $this->compressionTracker->updateProgress($processId, 100, ImageOperationStatus::COMPLETED);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas kompresji obrazu', [
                'processId' => $processId,
                'error' => $e->getMessage()
            ]);

            $this->compressionTracker->updateProgress($processId, 0, ImageOperationStatus::FAILED, $e->getMessage());

            $output->writeln("<error>Błąd: {$e->getMessage()}</error>");

            return Command::FAILURE;
        }
    }
} 