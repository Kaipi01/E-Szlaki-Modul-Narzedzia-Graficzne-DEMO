<?php 

namespace App\Service\GraphicsToolsModule\Contracts;

use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;

interface ImagesCompressorInterface 
{  
    public function compressImage(UploadedFile $image): array;  
}