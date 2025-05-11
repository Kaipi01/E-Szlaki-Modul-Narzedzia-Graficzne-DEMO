<?php 

namespace App\Service\GraphicsToolsModule\Converter\Contracts;

use App\Service\GraphicsToolsModule\Converter\DTO\ConversionResults;

interface ConverterInterface
{
    /** 
     * Konwertuje obraz z jednego formatu na inny
     * @param string $imagePath ścieżka do pliku
     * @param string $convertToType konwersja na typ? (w formacie mime np. 'image/webp', 'image/jpeg', 'image/png')
     * @param int $quality Jakość konwersji (1-100)
     * @param \Closure|null $afterOperationCallback Callback wywołuje się tuż po zakończeniu operacji ale przed liczeniem wyniku
     * @return ConversionResults Wyniki konwersji grafiki
     */
    public function convert(string $imagePath, string $convertToType, int $quality = 100, ?\Closure $afterOperationCallback = null): ConversionResults;
}