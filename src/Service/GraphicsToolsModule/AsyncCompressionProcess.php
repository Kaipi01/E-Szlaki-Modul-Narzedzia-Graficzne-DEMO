<?php

namespace App\Service\GraphicsToolsModule;

use Psr\Log\LoggerInterface;
use Symfony\Component\Process\Process;

class AsyncCompressionProcess
{
    private string $progressDir;

    public function __construct(
        private LoggerInterface $logger,
        private string $projectDir
    ) {
        // Katalog do przechowywania plików postępu
        $this->progressDir = $this->projectDir . '/var/compression-progress/';
        
        // Upewnij się, że katalog istnieje
        if (!is_dir($this->progressDir)) {
            mkdir($this->progressDir, 0755, true);
        }
    }

    /**
     * Rozpoczyna asynchroniczną kompresję obrazu
     */
    public function compressAsync(string $jobId, string $imagePath): void
    {
        // Ustawienie początkowego statusu
        $this->updateProgress($jobId, 20, 'uploaded');
        
        // Przygotowanie skryptu PHP do wykonania w tle
        $scriptPath = $this->projectDir . '/bin/compress-image.php';
        
        // Uruchomienie procesu asynchronicznego
        $process = new Process([
            'php',
            $scriptPath,
            $jobId,
            $imagePath,
            $this->progressDir // Przekaż ścieżkę do katalogu postępu
        ]);
        
        $process->setTimeout(null); // Brak limitu czasu
        
        // Obsługa wyjścia procesu (opcjonalnie)
        $process->start(function ($type, $buffer) use ($jobId) {
            if (Process::OUT === $type) {
                $this->logger->info('Proces kompresji: ' . $buffer, ['jobId' => $jobId]);
            } else { // Process::ERR
                $this->logger->error('Błąd procesu kompresji: ' . $buffer, ['jobId' => $jobId]);
            }
        });
        
        $this->logger->info('Uruchomiono asynchroniczny proces kompresji', [
            'jobId' => $jobId,
            'pid' => $process->getPid()
        ]);
    }
    
    /**
     * Aktualizuje postęp kompresji w pliku
     */
    public function updateProgress(string $jobId, int $progress, string $status, array $additionalData = []): void
    {
        $data = array_merge([
            'progress' => $progress,
            'status' => $status,
            'updatedAt' => time()
        ], $additionalData);
        
        file_put_contents(
            $this->progressDir . $jobId . '.json',
            json_encode($data)
        );
    }
    
    /**
     * Pobiera aktualny postęp kompresji
     */
    public function getProgress(string $jobId): ?array
    {
        $progressFile = $this->progressDir . $jobId . '.json';
        
        if (!file_exists($progressFile)) {
            return null;
        }
        
        $content = file_get_contents($progressFile);
        return json_decode($content, true);
    }
    
    /**
     * Czyści plik postępu (opcjonalnie)
     */
    public function clearProgress(string $jobId): void
    {
        $progressFile = $this->progressDir . $jobId . '.json';
        
        if (file_exists($progressFile)) {
            unlink($progressFile);
        }
    }
}
