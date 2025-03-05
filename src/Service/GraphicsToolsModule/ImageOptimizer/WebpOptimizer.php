<?php 

namespace App\Service\GraphicsToolsModule\ImageOptimizer;

use Liip\ImagineBundle\Binary\BinaryInterface;
use Liip\ImagineBundle\Model\Binary;
use Liip\ImagineBundle\Imagine\Filter\PostProcessor\PostProcessorInterface;
use Spatie\ImageOptimizer\OptimizerChainFactory;

class WebpOptimizer implements PostProcessorInterface
{
    public function process(BinaryInterface $binary, array $options = []): BinaryInterface
    {
        // Utworzenie łańcucha optymalizatorów
        $optimizerChain = OptimizerChainFactory::create();
        
        // Zapisz obraz tymczasowo
        $tmpFile = tempnam(sys_get_temp_dir(), 'webp_optimizer');
        $tmpOutputFile = $tmpFile . '.webp';
        file_put_contents($tmpFile, $binary->getContent());
        
        // Konwersja do WebP (musimy to zrobić ręcznie, ponieważ OptimizerChain nie konwertuje formatów)
        // Używamy narzędzia cwebp w linii poleceń
        $quality = $options['quality'] ?? 80;
        exec("cwebp -q {$quality} {$tmpFile} -o {$tmpOutputFile}");
        
        if (file_exists($tmpOutputFile)) {
            // Optymalizacja wygenerowanego pliku WebP
            $optimizerChain->optimize($tmpOutputFile);
            
            // Odczytaj zoptymalizowany obraz
            $optimizedContent = file_get_contents($tmpOutputFile);
        } else {
            // Jeśli konwersja się nie powiodła, zwróć oryginalny plik
            $optimizedContent = $binary->getContent();
        }
        
        // Usuń pliki tymczasowe
        if (file_exists($tmpFile)) {
            unlink($tmpFile);
        }
        if (file_exists($tmpOutputFile)) {
            unlink($tmpOutputFile);
        }
        
        // Zwróć zoptymalizowany obraz
        return new Binary(
            $optimizedContent,
            'image/webp',
            'webp'
        );
    }
}


// namespace App\Service\GraphicsToolsModule\ImageOptimizer;

// use Liip\ImagineBundle\Binary\BinaryInterface;
// use Liip\ImagineBundle\Model\Binary;
// use Liip\ImagineBundle\Imagine\Filter\PostProcessor\PostProcessorInterface;
// use Spatie\ImageOptimizer\Optimizers\Cwebp;

// class WebpOptimizer implements PostProcessorInterface
// {
//     public function process(BinaryInterface $binary, array $options = []): BinaryInterface
//     {
//         // Utworzenie optymalizatora dla WebP
//         $optimizer = new Cwebp([
//             '-m 6', // Metoda kompresji (0-6), gdzie 6 to najlepsza kompresja
//             '-q 80', // Jakość (0-100)
//             '-mt', // Wielowątkowość
//             '-quiet' // Brak informacji diagnostycznych
//         ]);

//         // // Zapisz obraz tymczasowo
//         // $tmpFile = tempnam(sys_get_temp_dir(), 'webp_optimizer');
//         // file_put_contents($tmpFile, $binary->getContent());
        
//         // // Zoptymalizuj obraz
//         // $optimizer->optimize($tmpFile); 

//          // Zapisz obraz tymczasowo
//          $tmpFile = tempnam(sys_get_temp_dir(), 'webp_optimizer');
//          $tmpOutputFile = $tmpFile . '.webp';
//          file_put_contents($tmpFile, $binary->getContent());
         
//          // Zoptymalizuj obraz - metoda executeOptimizer zamiast optimize
//          $optimizer->setImagePath($tmpFile);
//          $optimizer->setOutputPath($tmpOutputFile);
//          $optimizer->executeOptimizer();
        
//         // Odczytaj zoptymalizowany obraz
//         $optimizedContent = file_get_contents($tmpFile);
        
//         // Usuń plik tymczasowy
//         unlink($tmpFile);
        
//         // Zwróć zoptymalizowany obraz
//         return new Binary(
//             $optimizedContent,
//             'image/webp',
//             'webp'
//         );
//     }
// }
