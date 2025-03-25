<?php

namespace App\Service\GraphicsToolsModule\Compressor\Contracts;

interface TrackCompressionProgressInterface
{
    /** Inicjuj śledzenie postępu */
    public function initTracking(string $hash): void;

     /** Aktualizuje postęp kompresji w pliku */
    public function updateProgress(string $hash, int $progress, string $status, string $error = ''): void;

    /** Pobiera aktualny postęp kompresji dla danego obrazu */
    public function getProgress(string $hash): ?array;

    /** Usuwa informacje o postępie */
    public function clearProgress(string $hash): void;

    /** Czyści stare pliki postępu */
    public function cleanupOldProgressFiles(int $maxAgeInSeconds = 3600): int;

    /** Wyświetl aktulany postęp w konsoli */
    public function showProgressLog(string $processHash): void;
}