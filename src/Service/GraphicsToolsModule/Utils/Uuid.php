<?php 

namespace App\Service\GraphicsToolsModule\Utils;

class Uuid
{
    public static function generate(): string 
    {
        // Generuje 16 losowych bajtów
        $data = random_bytes(16);
        
        // Ustawia wersję (4) i wariant (RFC 4122)
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        
        // Formatuje jako UUID
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}