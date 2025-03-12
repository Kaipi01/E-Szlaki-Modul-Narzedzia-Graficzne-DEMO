<?php 

namespace App\Service\GraphicsToolsModule;

use App\Command\GTMProcessCompressionJobCommand;
use App\Service\GraphicsToolsModule\Contracts\CompressionJobDispatcherInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use Symfony\Component\DependencyInjection\ContainerInterface;

class CompressionJobDispatcher implements CompressionJobDispatcherInterface
{
    public function __construct(
        private LoggerInterface $logger,
        private string $projectDir,
        private ContainerInterface $container,
        private GTMProcessCompressionJobCommand $compressionCommand
    ) {}

    public function dispatch(int $jobId): void
    {
        $this->logger->debug("---------------------------START---------------------------");
        
        try {
            // Przygotowanie inputu dla komendy
            $input = new ArrayInput([
                'jobId' => $jobId, // Nazwa argumentu musi być zgodna z definicją w komendzie
                // '--env' => $_ENV['APP_ENV']
            ]);

            // $command = new GTMProcessCompressionJobCommand();
            
            // Uruchomienie komendy bezpośrednio
            $returnCode = $this->compressionCommand->run($input, new NullOutput());
            
            if ($returnCode === 0) {
                $this->logger->debug('Zadanie kompresji zostało uruchomione pomyślnie', [
                    'jobId' => $jobId
                ]);
            } else {
                $this->logger->error('Zadanie kompresji zakończyło się z błędem', [
                    'jobId' => $jobId,
                    'returnCode' => $returnCode
                ]);
            }
        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas uruchamiania zadania kompresji', [
                'jobId' => $jobId,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        } finally {
            $this->logger->debug("------------------------END-----------------------");
        }
    }
}