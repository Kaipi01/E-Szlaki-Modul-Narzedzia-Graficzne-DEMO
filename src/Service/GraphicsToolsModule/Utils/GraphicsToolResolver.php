<?php 

namespace App\Service\GraphicsToolsModule\Utils;

use Intervention\Image\Interfaces\ImageManagerInterface;
use Intervention\Image\Drivers\Imagick\Driver as DriverImagick;
use Intervention\Image\Drivers\GD\Driver as DriverGD;
use Intervention\Image\ImageManager;

class GraphicsToolResolver
{
    public const DRIVER_IMAGICK = 'imagick';
    public const DRIVER_GD = 'gd'; 
    public const JPEGOPTIM = 'jpegoptim';
    public const JPEGTRAN = 'jpegtran';
    public const OPTIPNG = 'optipng';
    public const PNGQUANT = 'pngquant';
    public const CWEBP = 'cwebp';

    /** Pobiera najlesze dostępne rozszerzenie do manipulacji grafikami */
    public static function getDriver(): string
    { 
        if (extension_loaded('imagick') && class_exists('Imagick')) {
            return self::DRIVER_IMAGICK;
        } else {
            return self::DRIVER_GD;
        }
    }

    public static function getImageManager(): ImageManagerInterface
    {
        $driver = self::isImagickAvailable() ? new DriverImagick() : new DriverGD();
        return new ImageManager($driver);
    }

    /**
     * Sprawdza, czy narzędzie Imagick jest dostępne w systemie  
     * @return bool
     */
    public static function isImagickAvailable(): bool
    {  
        return self::getDriver() === self::DRIVER_IMAGICK;
    }

    /**
     * Sprawdza, czy narzędzie jest dostępne w systemie 
     * @param string $toolPath Ścieżka do narzędzia 
     * @return bool
     */
    public static function isToolAvailable(string $toolPath): bool
    {  
        return file_exists($toolPath) && is_executable($toolPath);
    }
}