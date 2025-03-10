<?php 

namespace App\Service\GraphicsToolsModule;

use App\Command\GTMProcessCompressionJobCommand;
use App\Service\GraphicsToolsModule\Contracts\CompressionJobDispatcherInterface;
use Symfony\Component\Process\Process;
use Psr\Log\LoggerInterface;

class CompressionJobDispatcher implements CompressionJobDispatcherInterface
{
    public function __construct(
        private LoggerInterface $logger,
        private string $projectDir
    ) {}

    public function dispatch(int $jobId): void
    {  
        // Uruchom komendę console w tle
        $command = [
            'php',
            $this->projectDir . '/bin/console',
            GTMProcessCompressionJobCommand::getDefaultName(),
            $jobId,
            '--env=' . $_ENV['APP_ENV']
        ];
        
        try {
            $process = new Process($command);
            $process->disableOutput();
            $process->start();
            
            $this->logger->info('Uruchomiono zadanie kompresji w tle', [
                'jobId' => $jobId,
                'pid' => $process->getPid()
            ]);
        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas uruchamiania zadania kompresji', [
                'jobId' => $jobId,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }
}
