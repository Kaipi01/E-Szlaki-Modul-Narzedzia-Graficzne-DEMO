<?php

namespace App\Service\GraphicsToolsModule\Utils;

use App\Entity\GTMImage;
use App\Service\GraphicsToolsModule\Compressor\CompressionProcess;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface; 
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageProcessDispatcherInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Messenger\MessageBusInterface; 
use Psr\Log\LoggerInterface;

class ImageProcessDispatcher implements ImageProcessDispatcherInterface
{
    public function __construct(
        private LoggerInterface $logger,
        private MessageBusInterface $messageBus,
        private CompressionProcess $compressionProcess,
        private ParameterBagInterface $params
    ) {}

    public function dispatch(string $processHash, int $userId, UploadedFile $image, string $operationType): void
    {
        $tempPath = $image->getRealPath();
        $mimeType = $image->getMimeType();
        $uploadDir = $this->params->get('gtm_uploads_tmp');

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $fileName = $image->getClientOriginalName();
        $newFilePath = "$uploadDir/$fileName";

        // Kopiuj plik do trwałej lokalizacji
        copy($tempPath, $newFilePath);

        try {
            if (!file_exists($tempPath)) {
                throw new \RuntimeException("Plik tymczasowy nie istnieje: {$tempPath}");
            } 

            match ($operationType) {
                GTMImage::OPERATION_COMPRESSION => $this->compressionProcess->start($processHash, $userId, $newFilePath, $fileName, $mimeType),
                // GTMImage::OPERATION_CONVERSION =>  ,
                default => throw new \InvalidArgumentException("Nieznana operacja: $operationType")
            }; 

            $this->logger->debug('Rozpoczęcie operacji', [
                'processHash' => $processHash,
                'imageName' => $image->getClientOriginalName(),
                'userId' => $userId
            ]);
        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas uruchamiania operacji', [
                'processHash' => $processHash,
                'operation' => $operationType,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }
}















// Wyślij wiadomość do kolejki 
            // $this->messageBus->dispatch(new ImageProcessingMessage(
            //     $operationType,
            //     $processHash,
            //     $newFilePath,
            //     $userId,
            //     $image->getClientOriginalName(),
            //     $image->getMimeType()
            // ));

            // // Uruchom konsumenta w tle
            // $this->startConsumerInBackground();



///** Uruchomienie konsumenta Messenger w tle */
    // private function startConsumerInBackground(): void
    // {
    //     $this->logger->debug('----------------------------------------------------------------------------------');

    //     $projectDir = $this->params->get('kernel.project_dir');
    //     $phpPath = PHP_BINARY;
    //     $consolePath = "{$projectDir}/bin/console";

    //     $command = sprintf(
    //         'start /B %s %s messenger:consume gtm_image_processing_queue --limit=10 --no-wait --verbose > %s 2>&1',
    //         escapeshellarg($phpPath),
    //         escapeshellarg($consolePath),
    //         escapeshellarg($projectDir . '/var/log/messenger_consumer.log')
    //     );

    //     $this->logger->debug('Uruchamianie konsumenta przez exec', [
    //         'command' => $command
    //     ]);

    //     // Windows wymaga 'start /B' aby uruchomić proces w tle
    //     exec($command, $output, $returnCode);

    //     if ($returnCode !== 0) {
    //         $this->logger->error('Nie udało się uruchomić konsumenta', [
    //             'returnCode' => $returnCode,
    //             'output' => implode("\n", $output)
    //         ]);
    //     } else {
    //         $this->logger->debug('Uruchomiono konsumenta');
    //     }

    //     // Sprawdź, czy PHP_BINARY jest dostępne
    //     if (!file_exists(PHP_BINARY)) {
    //         $this->logger->error('PHP_BINARY nie istnieje', [
    //             'PHP_BINARY' => PHP_BINARY
    //         ]);
    //         return;
    //     }

    //     // Sprawdź, czy plik konsoli istnieje
    //     $consolePath = "{$projectDir}/bin/console";
    //     if (!file_exists($consolePath)) {
    //         $this->logger->error('Plik konsoli nie istnieje', [
    //             'consolePath' => $consolePath
    //         ]);
    //         return;
    //     }   

    //     $this->logger->debug('----------------------------------------------------------------------------------'); 


    //     // $projectDir = $this->params->get('kernel.project_dir');
    //     // $logFile = $projectDir . '/var/log/messenger_consumer.log';

    //     // // Uruchom proces w tle z przekierowaniem wyjścia do pliku
    //     // $process = new Process([
    //     //     PHP_BINARY,
    //     //     "{$projectDir}/bin/console",
    //     //     'messenger:consume',
    //     //     'gtm_image_processing_queue',
    //     //     '--limit=10',
    //     //     '--time-limit=60',
    //     //     '--verbose'
    //     // ]);
    //     // $process->setWorkingDirectory($projectDir);

    //     // // Przekieruj wyjście do pliku log
    //     // $process->start(function ($type, $buffer) use ($logFile) {
    //     //     file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . '] ' . $buffer, FILE_APPEND);
    //     // });

    //     // // Sprawdź, czy proces został uruchomiony
    //     // if (!$process->isRunning()) {
    //     //     $this->logger->error('Nie udało się uruchomić konsumenta', [
    //     //         'errorOutput' => $process->getErrorOutput()
    //     //     ]);
    //     // } else {
    //     //     $this->logger->debug('Uruchomiono konsumenta', [
    //     //         'pid' => $process->getPid()
    //     //     ]);
    //     // }
    // }
// $this->logger->debug('Uruchomiono konsumenta', [
        //     'nazwa-kolejki' => 'gtm_image_processing_queue'
        // ]); 

        // $projectDir = $this->params->get('kernel.project_dir');
        // $command = [
        //     PHP_BINARY,
        //     "{$projectDir}/bin/console",
        //     'messenger:consume',
        //     'gtm_image_processing_queue',
        //     '--limit=10', // Ogranicz do 10 wiadomości
        //     '--time-limit=60' // Ogranicz czas wykonania do 60 sekund
        // ];

        // // php bin/console messenger:consume gtm_image_processing_queue --verbose

        // // Uruchom proces w tle
        // $process = new Process($command); 

        // if (\PHP_OS_FAMILY === 'Windows') {
        //     // `popen()` pozwala na uruchomienie procesu bez konsoli
        //     // 'start /B ' pozwala na uruchomienie procesu bez wyskakujących okienek
        //     // niestety ten zjebany windows w wersji 11 pokazuje okno z wyborem programu kiedy proces się zaczyna
        //     $commandString = 'start /B ' . implode(' ', array_map('escapeshellarg', $command));
        //     pclose(popen($commandString, 'r'));
        // } else {
        //     // Uruchomienie procesu w tle na Linux/macOS
        //     $process = new Process($command);
        //     $process->setOptions(['create_process_group' => true]);
        //     $process->start();
        // }  