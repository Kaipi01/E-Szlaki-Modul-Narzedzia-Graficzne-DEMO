<?php

namespace App\Service\GraphicsToolsModule;

use App\Service\GraphicsToolsModule\Contracts\TrackCompressionProgressInterface;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;

class TrackCompressionProgressService implements TrackCompressionProgressInterface
{
    private FilesystemAdapter $cache;
    
    public function __construct()
    {
        $this->cache = new FilesystemAdapter('compression_progress', 0, '%kernel.project_dir%/var/cache');
    }
    
    /** Aktualizuje postęp kompresji dla danego obrazu */
    public function updateProgress(string $imageId, int $progress): void
    {
        $cacheItem = $this->cache->getItem("progress_$imageId");
        $cacheItem->set($progress);
        $this->cache->save($cacheItem);
    }
    
    /** Pobiera aktualny postęp kompresji dla danego obrazu */
    public function getProgress(string $imageId): int
    {
        $cacheItem = $this->cache->getItem("progress_$imageId");
        
        if (!$cacheItem->isHit()) {
            return 0;
        }
        
        return $cacheItem->get();
    }
}















<?php

namespace App\Service\GraphicsToolsModule;

use App\Service\GraphicsToolsModule\Contracts\TrackCompressionProgressInterface;

class TrackCompressionProgressService implements TrackCompressionProgressInterface
{ 
    private string $progressDir;

    public function __construct(private string $projectDir)
    { 
        $this->progressDir = "{$this->projectDir}/var/compression-progress/";
 
        if (!is_dir($this->progressDir)) {
            mkdir($this->progressDir, 0755, true);
        }
    } 

    /** Aktualizuje postęp kompresji w pliku */
    public function updateProgress(string $id, int $progress, string $status, string $error = ''): void
    {
        $progressData =  [ 
            'updatedAt' => time(), 
            'progress' => $progress,
            'status' => $status,
            'error' => $error,
        ];
        
        file_put_contents("{$this->progressDir}$id.json", json_encode($progressData));
    }

    /** Pobiera aktualny postęp kompresji dla danego obrazu */
    public function getProgress(string $imageId): ?array
    {
        $progressFile = "{$this->progressDir}$imageId";

        if (!file_exists($progressFile)) {
            return null;
        }
        $fileContent = file_get_contents($progressFile);
 
        return json_decode($fileContent);
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
 