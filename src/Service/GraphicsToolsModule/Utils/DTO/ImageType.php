<?php

namespace App\Service\GraphicsToolsModule\Utils\DTO;

class ImageType
{
    public const MIME_JPEG = 'image/jpeg';
    public const MIME_JPG = 'image/jpg';
    public const MIME_PNG = 'image/png';
    public const MIME_GIF = 'image/gif';
    public const MIME_WEBP = 'image/webp';
    public const MIME_BMP = 'image/bmp';
    public const MIME_AVIF = 'image/avif';
    public const MIME_TIFF = 'image/tiff'; 
    public const EXT_JPEG = 'jpeg';
    public const EXT_JPG = 'jpg';
    public const EXT_PNG = 'png';
    public const EXT_GIF = 'gif';
    public const EXT_WEBP = 'webp';
    public const EXT_BMP = 'bmp';
    public const EXT_AVIF = 'avif';
    public const EXT_TIFF = 'tiff';
    public const EXT_TIF = 'tif';

    /** Tablica wszystkich dozwolonych typów MIME */
    public static array $allowedMimeTypes = [
        self::MIME_JPEG,
        self::MIME_JPG,
        self::MIME_PNG,
        self::MIME_GIF,
        self::MIME_WEBP,
        self::MIME_BMP,
        self::MIME_AVIF,
        self::MIME_TIFF
    ];

    /** Tablica wszystkich dozwolonych rozszerzeń plików */
    public static array $allowedExtensions = [
        self::EXT_JPEG,
        self::EXT_JPG,
        self::EXT_PNG,
        self::EXT_GIF,
        self::EXT_WEBP,
        self::EXT_BMP,
        self::EXT_AVIF,
        self::EXT_TIFF,
        self::EXT_TIF
    ]; 

    /**
     * Sprawdza, czy podany typ MIME jest dozwolony 
     * @param string $mimeType Typ MIME do sprawdzenia
     * @return bool
     */
    public static function isAllowedMimeType(string $mimeType): bool
    {
        return in_array(strtolower($mimeType), self::$allowedMimeTypes);
    }

    /**
     * Sprawdza, czy podane rozszerzenie pliku jest dozwolone 
     * @param string $extension Rozszerzenie pliku do sprawdzenia
     * @return bool
     */
    public static function isAllowedExtension(string $extension): bool
    {
        return in_array(strtolower($extension), self::$allowedExtensions);
    }

    /**
     * Zwraca wszystkie dozwolone typy MIME 
     * @return array
     */
    public static function getAllowedMimeTypes(): array
    {
        return self::$allowedMimeTypes;
    }

    /**
     * Zwraca wszystkie dozwolone rozszerzenia plików 
     * @return array
     */
    public static function getAllowedExtensions(): array
    {
        return self::$allowedExtensions;
    }

    /**
     * Zwraca typy MIME dla formatów przezroczystych 
     * @return array
     */
    public static function getTransparentMimeTypes(): array
    {
        return [
            self::MIME_PNG,
            self::MIME_WEBP,
            self::MIME_GIF,
            self::MIME_AVIF
        ];
    }

    /**
     * Zwraca rozszerzenia dla formatów przezroczystych 
     * @return array
     */
    public static function getTransparentExtensions(): array
    {
        return [
            self::EXT_PNG,
            self::EXT_WEBP,
            self::EXT_GIF,
            self::EXT_AVIF
        ];
    } 
}
