<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Command\GTMCompressImageCommand;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput; 
use Exception;

class CompressionProcess
{
    public function __construct(private GTMCompressImageCommand $compressCommand, private string $projectDir) {}

    public function start(string $processHash, int $userId, string $imagePath, string $originalName, string $mimeType): void
    { 
        $input = new ArrayInput([
            'processHash' => $processHash,
            'tempPath' => $imagePath,
            'originalName' => $originalName,
            'mimeType' => $mimeType,
            'userId' => $userId
        ]);

        $returnCode = $this->compressCommand->run($input, new NullOutput());

        if ($returnCode !== 0) {
            throw new Exception("Zadanie kompresji zakończyło się z błędem. Kod błędu: $returnCode");
        }
    }
}






// $command = [
        //     PHP_BINARY,
        //     "{$this->projectDir}/bin/console",
        //     GTMCompressImageCommand::getDefaultName(),
        //     $processHash,
        //     $userId,
        //     $imagePath,
        //     $originalName,
        //     $mimeType ?? ''
        // ];


        // Wykonanie asynchroniczne procesu przez urchomienie go w konsoli (szybsza metoda wymaga więcej zasobów serwera)

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