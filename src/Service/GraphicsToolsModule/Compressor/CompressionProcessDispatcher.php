<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Command\GTMCompressImageCommand;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressionProcessDispatcherInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Process\Process;

class CompressionProcessDispatcher implements CompressionProcessDispatcherInterface
{
    public function __construct(private LoggerInterface $logger, private string $projectDir, private GTMCompressImageCommand $compressCommand) {}

    public function dispatch(string $processId, int $userId, UploadedFile $image): void
    {
        $tempPath = $image->getRealPath();

        try {
            if (!file_exists($tempPath)) {
                throw new \RuntimeException("Plik tymczasowy nie istnieje: {$tempPath}");
            } 

            $this->logger->debug('Uruchomiono zadanie kompresji w tle', [
                'processId' => $processId,
                'imageName' => $image->getClientOriginalName(),
                'userId' => $userId
            ]);

            $input = new ArrayInput([
                'processId' => $processId, 
                'userId' => $userId,
                'tempPath' => $tempPath, 
                'originalName' => $image->getClientOriginalName(), 
                'mimeType' => $image->getMimeType()
            ]);

            $returnCode = $this->compressCommand->run($input, new NullOutput());

            if ($returnCode !== 0) {
                throw new \Exception("Zadanie kompresji zakończyło się z błędem. Kod błędu: $returnCode");
            } 
            
            // $processCommandConfig = [
            //     'php',
            //     "{$this->projectDir}/bin/console",
            //     GTMCompressImageCommand::getDefaultName(),
            //     $processId,
            //     $userId,
            //     $tempPath,
            //     $image->getClientOriginalName(),
            //     $image->getMimeType() ?? ''
            // ];
 
            // $process = new Process($processCommandConfig); 
            // $process->start();  


            // $process->run(function ($type, $buffer): void {
            //     if (Process::ERR === $type) {
            //         $this->logger->debug("ERR > $buffer");
            //     } else {
            //         $this->logger->debug("OUT > $buffer");
            //     }
            // }); 

            

        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas uruchamiania zadania kompresji', [
                'processId' => $processId,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }
}