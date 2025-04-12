<?php

namespace App\Service\GraphicsToolsModule\Utils;

use App\Service\GraphicsToolsModule\Utils\Contracts\ImageFileValidatorInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageType;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use InvalidArgumentException;

class ImageFileValidator implements ImageFileValidatorInterface
{ 
    /** Wzorce niebezpiecznych elementów w nazwach plików */
    private const DANGEROUS_PATTERNS = [
        '/\.\./', // Zapobiega atakom traversal path
        '/[\x00-\x1F\x7F]/', // Znaki kontrolne
        '/[<>:"\/\\|?*]/', // Znaki niedozwolone w nazwach plików w większości systemów
        '/\.php$/i', // Pliki PHP
        '/\.phtml$/i', // Pliki PHP
        '/\.phar$/i', // Pliki PHP
        '/\.htaccess$/i', // Pliki konfiguracyjne Apache
        '/\.sh$/i', // Skrypty powłoki
        '/\.asp$/i', // ASP
        '/\.aspx$/i', // ASP.NET
        '/\.cgi$/i', // CGI
        '/\.exe$/i', // Pliki wykonywalne
        '/\.bat$/i', // Pliki wsadowe
        '/\.cmd$/i', // Pliki poleceń
        '/\.dll$/i', // Biblioteki DLL
        '/\.jsp$/i', // Java Server Pages
    ];


    /**
     * Waliduje obraz pod kątem typu MIME i bezpiecznej nazwy pliku 
     * @param UploadedFile $image Plik obrazu do walidacji
     * @throws InvalidArgumentException Gdy obraz nie przejdzie walidacji
     */
    public function validate(UploadedFile $image): void
    {
        // Sprawdzenie typu MIME
        $mimeType = $image->getMimeType(); 

        if (!in_array($mimeType, ImageType::getAllowedMimeTypes(), true)) {
            $allowedMimeTypes = "";

            foreach (ImageType::getAllowedMimeTypes() as $type) {
                $allowedMimeTypes .= str_replace('image/', '', $type). ", ";
            }

            throw new InvalidArgumentException("Niedozwolony typ pliku: $mimeType. Dozwolone są tylko typy: $allowedMimeTypes.");
        }

        // Sprawdzenie bezpieczeństwa nazwy pliku
        $originalFilename = $image->getClientOriginalName();

        foreach (self::DANGEROUS_PATTERNS as $pattern) {
            if (preg_match($pattern, $originalFilename)) {
                throw new InvalidArgumentException("Nieprawidłowa nazwa pliku. Nazwa zawiera niedozwolone znaki lub rozszerzenie.");
            }
        }

        // Dodatkowe sprawdzenie długości nazwy pliku
        if (strlen($originalFilename) > 255) {
            throw new InvalidArgumentException("Nazwa pliku jest zbyt długa. Maksymalna długość to 255 znaków.");
        }

        // Sprawdzenie, czy plik faktycznie jest obrazem
        if (!$this->isRealImage($image)) {
            throw new InvalidArgumentException("Plik nie jest prawidłowym obrazem.");
        }
    }

    public function getSaveImageName(string $originalName, bool $keepOriginalName = false, bool $isUnique = false): string
    {
        if ($isUnique) {
            return $this->generateUniqueName($originalName);
        }

        $originalFilename = pathinfo($originalName, PATHINFO_FILENAME);
        $fileExtension = pathinfo($originalName, PATHINFO_EXTENSION);
        $safeFilename = transliterator_transliterate('Any-Latin; Latin-ASCII; [^A-Za-z0-9_] remove; Lower()', $originalFilename);
        $newFilename = $keepOriginalName ? $safeFilename : $safeFilename . '-' . uniqid();
        $newFilename .= ".{$fileExtension}";

        return $newFilename;
    }

    /**
     * Sprawdza, czy plik faktycznie jest obrazem, a nie tylko ma zmienione rozszerzenie 
     * @param UploadedFile $image Plik do sprawdzenia
     * @return bool True jeśli plik jest obrazem, false w przeciwnym wypadku
     */
    private function isRealImage(UploadedFile $image): bool
    {
        $path = $image->getRealPath();

        // Używamy getimagesize do sprawdzenia, czy plik jest faktycznie obrazem
        // Funkcja zwraca false dla plików, które nie są obrazami
        $imageInfo = @getimagesize($path);

        return $imageInfo !== false;
    }

    /**
     * Generuje bezpieczną nazwę pliku na podstawie oryginalnej nazwy 
     * @param string $originalFilename Oryginalna nazwa pliku
     * @return string Bezpieczna nazwa pliku
     */
    private function generateUniqueName(string $originalFilename): string
    {
        // Wyciągnij rozszerzenie pliku
        $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);

        // Wyczyść nazwę pliku (usuń znaki specjalne, pozostaw tylko alfanumeryczne i podkreślenia)
        $baseName = pathinfo($originalFilename, PATHINFO_FILENAME);
        $baseName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $baseName);

        // Ogranicz długość nazwy bazowej
        $baseName = substr($baseName, 0, 100);

        // Dodaj timestamp dla unikalności
        $timestamp = time();

        // Złóż bezpieczną nazwę pliku
        return "{$baseName}_{$timestamp}.{$extension}";
    } 
}
