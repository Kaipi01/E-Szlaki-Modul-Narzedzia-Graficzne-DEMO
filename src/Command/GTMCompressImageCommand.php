<?php

declare(strict_types=1);

namespace App\Command;
 
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
use App\Service\GraphicsToolsModule\Compressor\ImageEntityManager;
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

    public function __construct(
        private CompressorInterface $compressor,
        private TrackCompressionProgressInterface $compressionTracker,
        private LoggerInterface $logger,
        private ImageEntityManager $imageManager, 
        private string $compressedDir
    ) {
        parent::__construct();  
    }

    protected function configure(): void
    {
        $this
            ->addArgument('processHash', InputArgument::REQUIRED, 'Identyfikator zadania kompresji') 
            ->addArgument('tempPath', InputArgument::REQUIRED, 'Ścieżka do obrazu do kompresji')
            ->addArgument('originalName', InputArgument::REQUIRED, 'Orginalna nazwa grafiki')
            ->addArgument('mimeType', InputArgument::REQUIRED, 'Typ MIME')
            ->addArgument('userId', InputArgument::REQUIRED, 'ID Użytkownika');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {  
        $processHash = $input->getArgument('processHash'); 
        $tempPath = $input->getArgument('tempPath');
        $originalName = $input->getArgument('originalName');
        $mimeType = $input->getArgument('mimeType');  
        $userId = $input->getArgument('userId');  

        //sleep(15);

        $this->logger->debug('---------------------------------------------------------------------------------');
        $this->logger->debug('Komenda kompresji grafiki', [
            'processHash' => $processHash, 
            'tempPath' => $tempPath,
            'originalName' => $originalName,
            'mimeType' => $mimeType,
            'userId' => $userId,
        ]); 
        $this->logger->debug('---------------------------------------------------------------------------------');
        
        $this->compressionTracker->updateProgress($processHash, 20, ImageOperationStatus::PENDING);
        $this->compressionTracker->showProgressLog($processHash);

        try {
            $destinationDir = "{$this->compressedDir}/$userId";

            if (!is_dir($destinationDir)) {
                mkdir($destinationDir, 0755, true);
            }

            $this->compressionTracker->updateProgress($processHash, 40, ImageOperationStatus::PREPARING);
            $this->compressionTracker->showProgressLog($processHash);  

            $destinationPath = $destinationDir . "/" . basename($originalName);   

            copy($tempPath, $destinationPath);
            unlink($tempPath);

            $this->compressionTracker->updateProgress($processHash,  80, ImageOperationStatus::PROCESSING);
            $this->compressionTracker->showProgressLog($processHash);

            $compressionResults = $this->compressor->compress($destinationPath, $mimeType);
 
            $this->compressionTracker->updateProgress($processHash,  90, ImageOperationStatus::PROCESSING);
            $this->compressionTracker->showProgressLog($processHash);

            // Dodanie do grafiki
            $this->imageManager->saveAsCompressed($compressionResults, $processHash, $userId);  

            $output->writeln("Kompresja zakończona pomyślnie");

            // sleep(3);

            $this->compressionTracker->updateProgress($processHash, 100, ImageOperationStatus::COMPLETED);
            $this->compressionTracker->showProgressLog($processHash);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas kompresji obrazu', [
                'processHash' => $processHash,
                'error' => $e->getMessage()
            ]);

            $this->compressionTracker->updateProgress($processHash, 0, ImageOperationStatus::FAILED, $e->getMessage());

            $output->writeln("<error>Błąd: {$e->getMessage()}</error>");

            return Command::FAILURE;
        }
    }
} 