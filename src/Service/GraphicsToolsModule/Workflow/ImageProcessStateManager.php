<?php

namespace App\Service\GraphicsToolsModule\Workflow;

use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Workflow\Contracts\ImageProcessStateManagerInterface;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class ImageProcessStateManager implements ImageProcessStateManagerInterface {

    private const CACHE_EXPIRATION = 300; // 5 minut

    public function __construct(private CacheInterface $cache, private GTMLoggerInterface $logger) {}

    /** Zapisuje stan procesu w cache */
    public function save(string $processHash, mixed $processState): void
    {
        $cacheKey = $this->getKey($processHash); 
        
        $this->cache->delete($cacheKey); // Usuń stary stan, jeśli istnieje
        
        $this->cache->get($cacheKey, function (ItemInterface $item) use ($processState) {
            $item->expiresAfter(self::CACHE_EXPIRATION);

            return serialize($processState);
        });
    }

    /** Pobiera stan procesu z cache */
    public function get(string $processHash): mixed
    {
        $cacheKey = $this->getKey($processHash); 

        // Spróbuj pobrać stan procesu z cache
        $cachedProcessState = $this->cache->get($cacheKey, function (ItemInterface $item) {
            $item->expiresAfter(0); // Oznacz jako nieważny, jeśli nie znaleziono
            
            return null;
        }); 
        
        if ($cachedProcessState !== null) {
            try { 
                return unserialize($cachedProcessState);        
                
            } catch (\Exception $e) {
                // Jeśli wystąpił błąd podczas deserializacji, usuń wpis z cache
                $this->cache->delete($cacheKey); 
                $this->logger->error("Błąd deserializacji danych: " . $e->getMessage());
            }
        } 
        
        return null;
    }

    /** Czyści stan procesu z cache */
    public function clear(string $processHash): void
    {
        $cacheKey = $this->getKey($processHash); 
        $this->cache->delete($cacheKey);
    }

    public function getKey(string $processHash): string
    {
        return "process_state_{$processHash}";
    }
}