<?php

namespace App\Service\GraphicsToolsModule\Utils;

use Symfony\Component\HttpKernel\KernelInterface;

class PathResolver
{
    private string $projectDir;
    private string $publicDir;

    public function __construct(KernelInterface $kernel)
    {
        $this->projectDir = $kernel->getProjectDir();
        $this->publicDir = realpath("{$this->projectDir}/public");
    }

    /** Konwertuje ścieżkę absolutną na relatywną */
    public function getRelativePath(string $absolutePath): string
    {
        // Zamieniamy backslashes na slashe dla zgodności
        $absolutePath = str_replace('\\', '/', $absolutePath);
        $projectPath = str_replace('\\', '/', "{$this->projectDir}/public");

        // Usuwamy część ścieżki odpowiadającą katalogowi głównemu
        if (str_starts_with($absolutePath, $projectPath)) {
            return str_replace($projectPath, '', $absolutePath);
        }

        // Jeśli ścieżka nie należy do katalogu `public`, zwracamy oryginalną
        return $absolutePath;
    }

    /** Konwertuje ścieżkę relatywną na absolutną względem katalogu `public` */
    public function getAbsolutePath(string $relativePath): string
    {
        if ($this->isAbsolutePath($relativePath)) {
            return $relativePath;
        }

        return $this->publicDir . DIRECTORY_SEPARATOR . ltrim($relativePath, DIRECTORY_SEPARATOR);
    }

    /** 
     * Sprawdza, czy ścieżka jest absolutna 
     * na podstawie czy ścieżka zaczyna się od "/" (Unix) lub "C:\" (Windows) lub od "http://" lub "https://"
     */
    public function isAbsolutePath(string $path): bool
    { 
        return (bool) preg_match('/^(\/|[a-zA-Z]:[\\\\\/])/', $path) ||
            str_starts_with($path, 'http://') ||
            str_starts_with($path, 'https://');
    }
}