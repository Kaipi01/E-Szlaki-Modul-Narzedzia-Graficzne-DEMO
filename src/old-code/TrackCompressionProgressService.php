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

 