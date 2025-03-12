<?php

namespace App\Service\GraphicsToolsModule;

use App\Service\GraphicsToolsModule\Contracts\TrackCompressionProgressInterface;

class TrackCompressionProgressService implements TrackCompressionProgressInterface
{
    private string $progressDir;

    public function __construct(private string $projectDir)
    {
        // Katalog do przechowywania plików postępu
        $this->progressDir = "{$this->projectDir}/var/compression-progress/";

        // Upewnij się, że katalog istnieje
        if (!is_dir($this->progressDir)) {
            mkdir($this->progressDir, 0755, true);
        }
    }

    /** Aktualizuje postęp kompresji dla danego obrazu */
    public function updateProgress(string $imageId, int $progress): void
    {
        // Bezpośredni zapis liczby do pliku - najszybsza metoda
        file_put_contents("{$this->progressDir}$imageId", $progress);
    }

    /** Pobiera aktualny postęp kompresji dla danego obrazu */
    public function getProgress(string $imageId): int
    {
        $progressFile = "{$this->progressDir}$imageId";

        if (!file_exists($progressFile)) {
            return 0;
        }

        // Bezpośredni odczyt liczby z pliku - najszybsza metoda
        return (int)file_get_contents($progressFile);
    }

    /** Usuwa informacje o postępie */
    public function clearProgress(string $imageId): void
    {
        $progressFile = "{$this->progressDir}$imageId";

        if (file_exists($progressFile)) {
            unlink($progressFile);
        }
    }

    /** Czyści stare pliki postępu (opcjonalnie) */
    public function cleanupOldProgressFiles(int $maxAgeInSeconds = 3600): void
    {
        $files = glob("{$this->progressDir}*");
        $now = time();

        foreach ($files as $file) {
            if (is_file($file) && ($now - filemtime($file) > $maxAgeInSeconds)) {
                unlink($file);
            }
        }
    }
}
