<?php
 
namespace App\Service\GraphicsToolsModule\ImageOptimizer;

use Liip\ImagineBundle\Binary\BinaryInterface;
use Liip\ImagineBundle\Model\Binary;
use Liip\ImagineBundle\Imagine\Filter\PostProcessor\PostProcessorInterface; 
use Spatie\ImageOptimizer\Optimizers\Jpegoptim;

class JpegOptimizer implements PostProcessorInterface
{
    public function process(BinaryInterface $binary, array $options = []): BinaryInterface
    {
        if (!in_array($binary->getMimeType(), ['image/jpeg', 'image/jpg'])) {
            return $binary;
        }

        // Utworzenie optymalizatora tylko dla JPEG
        $optimizer = new Jpegoptim([
            '--strip-all',
            '--all-progressive',
            '--max=80'
        ]);

        // Zapisz obraz tymczasowo
        $tmpFile = tempnam(sys_get_temp_dir(), 'jpeg_optimizer');
        file_put_contents($tmpFile, $binary->getContent());
        
        // Zoptymalizuj obraz
        $optimizer->optimize($tmpFile);
        
        // Odczytaj zoptymalizowany obraz
        $optimizedContent = file_get_contents($tmpFile);
        
        // Usuń plik tymczasowy
        unlink($tmpFile);
        
        // Zwróć zoptymalizowany obraz
        return new Binary(
            $optimizedContent,
            $binary->getMimeType(),
            $binary->getFormat()
        );
    }
}
