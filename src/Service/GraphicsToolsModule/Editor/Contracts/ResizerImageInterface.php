<?php 

namespace App\Service\GraphicsToolsModule\Editor\Contracts;

interface ResizerImageInterface
{
    /**
     * Zwraca szerokość podanej grafiki
     * @param string $imagePath
     * @return int
    */
    public function getWidth(string $imagePath): int;
    
    /**
     * Zwraca wysokość podanej grafiki
     * @param string $imagePath
     * @return int
    */
    public function getHeight(string $imagePath): int;

    /**
     * Zmienia rozmiary podanej grafiki
     * 
     * @link https://image.intervention.io/v3/modifying/resizing#simple-image-resizing
     * @param string $imagePath
     * @param int $width
     * @param int $height
     * @throws \Exception
     * @return void
     */
    public function resize(string $imagePath, ?int $width = null, ?int $height = null): void;

    /**
     * Zmień rozmiar obrazu do podanej szerokości i/lub wysokości, nie przekraczając oryginalnych wymiarów
     *
     * @link https://image.intervention.io/v3/modifying/resizing#resizing-without-exceeding-the-original-size
     * @param string $imagePath
     * @param null|int $width
     * @param null|int $height
     * @throws \Exception
     * @return void
     */
    public function resizeDown(string $imagePath, ?int $width = null, ?int $height = null): void;

    /**
     * Zmień rozmiar obrazu do podanej szerokości i/lub wysokości, zachowując oryginalne proporcje
     *
     * @link https://image.intervention.io/v3/modifying/resizing#scaling-images
     * @param string $imagePath
     * @param null|int $width
     * @param null|int $height
     * @throws \Exception
     * @return void
     */
    public function scale(string $imagePath, ?int $width = null, ?int $height = null): void;

    /**
     * Zmień rozmiar obrazu do podanej szerokości i/lub wysokości, zachowaj oryginalne proporcje i 
     * nie przekraczaj oryginalnej szerokości lub wysokości obrazu.
     *
     * @link https://image.intervention.io/v3/modifying/resizing#scaling-images-but-do-not-exceed-the-original-size
     * @param string $imagePath
     * @param null|int $width
     * @param null|int $height
     * @throws \Exception
     * @return void
     */
    public function scaleDown(string $imagePath, ?int $width = null, ?int $height = null): void;
}