<?php 

namespace App\Service\GraphicsToolsModule\Converter\Contracts;

interface ConverterInterface
{
    /** 
     * Konwertuje obraz z jednego formatu na inny
     * @param string $imagePath ścieżka do pliku
     * @param string $convertToType konwersja na typ? (w formacie mime np. 'image/webp', 'image/jpeg', 'image/png')
     * @param int $quality Jakość konwersji (1-100)
     * @return bool Czy konwersja się powiodła
     */
    public function convert(string $imagePath, string $convertToType, int $quality = 100): bool;
}