<?php 

namespace App\Command;
 
use App\Repository\GTMCompressionJobRepository;
use App\Service\GraphicsToolsModule\ImagesCompressorService; 
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Psr\Log\LoggerInterface;

class GTMProcessCompressionJobCommand extends Command
{
    protected static $defaultName = 'gtm:process-compression-job';

    public function __construct(
        private ImagesCompressorService $compressor,
        private GTMCompressionJobRepository $jobRepository,
        private LoggerInterface $logger
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('jobId', InputArgument::REQUIRED, 'ID zadania kompresji')
        ;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $jobId = (int) $input->getArgument('jobId');
        
        $output->writeln("Rozpoczynam przetwarzanie zadania kompresji #{$jobId}");
        
        try {
            $this->compressor->processCompressionJob($jobId);
            $output->writeln("Zadanie kompresji #{$jobId} zostało zakończone");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas przetwarzania zadania kompresji', [
                'jobId' => $jobId,
                'error' => $e->getMessage()
            ]);
            
            $output->writeln("Błąd: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
}
