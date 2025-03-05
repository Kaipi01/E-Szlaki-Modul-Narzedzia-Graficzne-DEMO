<?php
 
namespace App\Service\GraphicsToolsModule\ImageOptimizer;

use Liip\ImagineBundle\Binary\BinaryInterface;
use Liip\ImagineBundle\Model\Binary;
use Liip\ImagineBundle\Imagine\Filter\PostProcessor\PostProcessorInterface;
use Spatie\ImageOptimizer\Optimizers\Pngquant;

class PngOptimizer implements PostProcessorInterface
{
    public function process(BinaryInterface $binary, array $options = []): BinaryInterface
    {
        if ($binary->getMimeType() !== 'image/png') {
            return $binary;
        }

        // Utworzenie optymalizatora tylko dla PNG
        $optimizer = new Pngquant([
            '--force',
            '--quality=80-90'
        ]);

        // Zapisz obraz tymczasowo
        $tmpFile = tempnam(sys_get_temp_dir(), 'png_optimizer');
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
