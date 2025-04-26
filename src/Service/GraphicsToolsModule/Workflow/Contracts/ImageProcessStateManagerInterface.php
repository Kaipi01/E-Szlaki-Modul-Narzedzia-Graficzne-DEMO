<?php 

namespace App\Service\GraphicsToolsModule\Workflow\Contracts;
 
interface ImageProcessStateManagerInterface {

    /** Zapisuje stan procesu w cache */
    public function save(string $processHash, mixed $processState): void;

    /** Pobiera stan procesu z cache */
    public function get(string $processHash): mixed;

    /** Czyści stan procesu z cache */
    public function clear(string $processHash): void;

    /** Pobierz klucz do danych cache */
    public function getKey(string $processHash): string;
}