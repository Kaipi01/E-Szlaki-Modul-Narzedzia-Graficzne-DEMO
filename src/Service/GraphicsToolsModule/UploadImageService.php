<?php

namespace App\Service\GraphicsToolsModule;
 
use App\Service\GraphicsToolsModule\Contracts\UploadImageServiceInterface; 
use Symfony\Component\HttpFoundation\File\UploadedFile;

class UploadImageService implements UploadImageServiceInterface
{
    public function getSaveImageName(UploadedFile $image): string 
    { 
        $originalName = pathinfo($image->getClientOriginalName(), PATHINFO_FILENAME); 
        
        $safeName = transliterator_transliterate(
            'Any-Latin; Latin-ASCII; [^A-Za-z0-9_] remove; Lower()',
            $originalName
        );
        return $safeName . '-' . uniqid() . '.' . $image->guessExtension(); 
    }

    public function upload(UploadedFile $image, string $uploadDir): string
    {
        $newImageName = $this->getSaveImageName($image);
 
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        } 
 
        $image->move($uploadDir, $newImageName);

        return $newImageName;
    }
}