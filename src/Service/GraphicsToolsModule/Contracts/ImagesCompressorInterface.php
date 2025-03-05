<?php 

namespace App\Service\GraphicsToolsModule\Contracts;

use Symfony\Component\HttpFoundation\Request;

interface ImagesCompressorInterface 
{
    public function handle(Request $reques, string $projectDir): array;
}