<?php

declare(strict_types=1);

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageOptimizerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use Symfony\Component\Mime\MimeTypeGuesserInterface;
use Spatie\ImageOptimizer\Optimizers\{Cwebp, Jpegoptim, Pngquant};
use Spatie\ImageOptimizer\OptimizerChainFactory;
use Exception;

class ImageOptimizerService implements ImageOptimizerInterface
{
    public function __construct(private GTMLoggerInterface $logger, private MimeTypeGuesserInterface $mimeTypeGuesser)
    {
    }

    /** @inheritDoc */
    public function optimize(string $imagePath, int $strength = 80): void
    {
        if (!file_exists($imagePath)) {
            throw new Exception("Plik nie istnieje: $imagePath");
        }
        $mimeType = $this->mimeTypeGuesser->guessMimeType($imagePath);
        $optimizerChain = OptimizerChainFactory::create();

        if ($strength < 1 || $strength > 100) {
            $strength = 80;
        }

        $optimizerChain
            ->addOptimizer(new Jpegoptim([
                '--strip-all',
                '--all-progressive',
                "--max=$strength"
            ]))
            ->addOptimizer(new Pngquant([
                '--force',
                "--quality=$strength",
                '--strip',
                '--verbose'
            ]))
            ->addOptimizer(new Cwebp([
                '-m 6',
                "-q $strength",
                '-mt',
                '-quiet'
            ]));

        $optimizerChain->optimize($imagePath);
    }
}



// use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageOptimizerInterface;
// use App\Service\GraphicsToolsModule\Utils\DTO\ImageExtensionTool;
// use Intervention\Image\ImageManager;
// use Intervention\Image\Drivers\Imagick\Driver as ImagickDriver;
// use Intervention\Image\Drivers\Gd\Driver as GdDriver;
// use Symfony\Component\Process\Process;
// use Symfony\Component\Process\Exception\ProcessFailedException;

// class ImageOptimizerService implements ImageOptimizerInterface
// {
//     private ImageManager $imageManager;
//     private bool $useExternalTools = true;
//     private array $binaries = [
//         'jpegoptim' => '/usr/bin/jpegoptim',
//         'pngquant' => '/usr/bin/pngquant',
//         'cwebp' => '/usr/bin/cwebp'
//     ];

//     public function __construct()
//     {
//         $driver = ImageExtensionTool::isImagickAvailable() ? new ImagickDriver() : new GdDriver();
//         $this->imageManager = new ImageManager($driver);
//         $this->useExternalTools = true;

//         // Sprawdź dostępność narzędzi zewnętrznych
//         if ($this->useExternalTools) {
//             $this->checkExternalTools();
//         }
//     }

//     /**
//      * Sprawdza dostępność zewnętrznych narzędzi do optymalizacji
//      */
//     private function checkExternalTools(): void
//     {
//         foreach ($this->binaries as $tool => $path) {
//             if (!file_exists($path) || !is_executable($path)) {
//                 // Jeśli narzędzie nie jest dostępne, wyłącz opcję używania zewnętrznych narzędzi
//                 $this->useExternalTools = false;
//                 error_log("Narzędzie {$tool} nie jest dostępne pod ścieżką {$path}");
//             }
//         }
//     }

//     /** @inheritDoc */
//     public function optimize(string $inputPath, array $options = []): bool
//     {
//         if (!file_exists($inputPath)) {
//             throw new \InvalidArgumentException("Plik wejściowy nie istnieje: {$inputPath}");
//         } 
//         $outputPath = $inputPath; 
//         $defaultOptions = [
//             'quality' => 100,
//             'resize' => null, // [width, height]
//             'format' => null, // null = zachowaj oryginalny format
//             'strip_metadata' => true,
//             'sharpen' => 0, // 0-100
//         ];

//         $options = array_merge($defaultOptions, $options);

//         try {
//             // Wczytaj obraz za pomocą Intervention/Image
//             $image = $this->imageManager->read($inputPath);

//             // Zmiana rozmiaru, jeśli podano
//             if ($options['resize'] && is_array($options['resize'])) {
//                 list($width, $height) = $options['resize'];
//                 $image->resize($width, $height, function ($constraint) {
//                     $constraint->aspectRatio();
//                     $constraint->upsize();
//                 });
//             }

//             // $image->

//             // Wyostrzanie, jeśli podano wartość > 0
//             if ($options['sharpen'] > 0) {
//                 $image->sharpen($options['sharpen'] / 10); // Dostosuj skalę do oczekiwań biblioteki
//             }

//             // Usuń metadane, jeśli opcja jest włączona
//             if ($options['strip_metadata'] && method_exists($image, 'removeMetadata')) {
//                 $image->removeMetadata();
//             }

//             // Określ format wyjściowy
//             $format = $options['format'] ?? pathinfo($inputPath, PATHINFO_EXTENSION);

//             // Zapisz plik tymczasowy lub docelowy
//             $tempFile = null;

//             if ($this->useExternalTools) {
//                 // Jeśli używamy zewnętrznych narzędzi, zapisz do pliku tymczasowego
//                 $tempFile = tempnam(sys_get_temp_dir(), 'img_') . '.' . $format;
//                 $image->save($tempFile, $options['quality']);

//                 // Optymalizuj za pomocą zewnętrznych narzędzi
//                 $this->optimizeWithExternalTools($tempFile, $outputPath, $format, $options);

//                 // Usuń plik tymczasowy
//                 if (file_exists($tempFile)) {
//                     unlink($tempFile);
//                 }
//             } else {
//                 // Jeśli nie używamy zewnętrznych narzędzi, zapisz bezpośrednio
//                 switch (strtolower($format)) {
//                     case 'jpg':
//                     case 'jpeg':
//                         $image->toJpeg($options['quality'])->save($outputPath);
//                         break;
//                     case 'png':
//                         $image->toPng()->save($outputPath);
//                         break;
//                     case 'webp':
//                         $image->toWebp($options['quality'])->save($outputPath);
//                         break;
//                     case 'avif':
//                         $image->toAvif($options['quality'])->save($outputPath);
//                         break;
//                     case 'gif':
//                         $image->toGif()->save($outputPath);
//                         break;
//                     default:
//                         $image->save($outputPath, $options['quality']);
//                 }
//             }

//             return file_exists($outputPath);
//         } catch (\Exception $e) {
//             error_log("Błąd podczas optymalizacji obrazu: " . $e->getMessage());
//             return false;
//         }
//     }

//     /**
//      * Optymalizuje obraz za pomocą zewnętrznych narzędzi
//      * 
//      * @param string $inputPath Ścieżka do pliku wejściowego
//      * @param string $outputPath Ścieżka do pliku wyjściowego
//      * @param string $format Format pliku
//      * @param array $options Opcje optymalizacji
//      * @return bool Czy optymalizacja się powiodła
//      */
//     private function optimizeWithExternalTools(string $inputPath, string $outputPath, string $format, array $options): bool
//     {
//         $format = strtolower($format);

//         switch ($format) {
//             case 'jpg':
//             case 'jpeg':
//                 return $this->optimizeJpeg($inputPath, $outputPath, $options);
//             case 'png':
//                 return $this->optimizePng($inputPath, $outputPath, $options);
//             case 'webp':
//                 return $this->optimizeWebp($inputPath, $outputPath, $options);
//             default:
//                 // Dla innych formatów, po prostu skopiuj plik
//                 copy($inputPath, $outputPath);
//                 return true;
//         }
//     }

//     /**
//      * Optymalizuje obraz JPEG za pomocą jpegoptim
//      * 
//      * @param string $inputPath Ścieżka do pliku wejściowego
//      * @param string $outputPath Ścieżka do pliku wyjściowego
//      * @param array $options Opcje optymalizacji
//      * @return bool Czy optymalizacja się powiodła
//      */
//     private function optimizeJpeg(string $inputPath, string $outputPath, array $options): bool
//     {
//         // Skopiuj plik wejściowy do wyjściowego, ponieważ jpegoptim operuje na miejscu
//         copy($inputPath, $outputPath);

//         // Przygotuj komendę jpegoptim
//         $command = [
//             $this->binaries['jpegoptim'],
//             '--strip-all', // Usuń wszystkie metadane
//             '--max=' . $options['quality'], // Ustaw maksymalną jakość
//             $outputPath
//         ];

//         return $this->runProcess($command);
//     }

//     /**
//      * Optymalizuje obraz PNG za pomocą pngquant
//      * 
//      * @param string $inputPath Ścieżka do pliku wejściowego
//      * @param string $outputPath Ścieżka do pliku wyjściowego
//      * @param array $options Opcje optymalizacji
//      * @return bool Czy optymalizacja się powiodła
//      */
//     private function optimizePng(string $inputPath, string $outputPath, array $options): bool
//     {
//         // Przygotuj komendę pngquant
//         $quality = $options['quality'];
//         $minQuality = max(1, $quality - 10); // Minimum 10% niższa jakość

//         $command = [
//             $this->binaries['pngquant'],
//             '--force',
//             '--quality=' . $minQuality . '-' . $quality,
//             '--output=' . $outputPath,
//             $inputPath
//         ];

//         return $this->runProcess($command);
//     }

//     /**
//      * Optymalizuje obraz WebP za pomocą cwebp
//      * 
//      * @param string $inputPath Ścieżka do pliku wejściowego
//      * @param string $outputPath Ścieżka do pliku wyjściowego
//      * @param array $options Opcje optymalizacji
//      * @return bool Czy optymalizacja się powiodła
//      */
//     private function optimizeWebp(string $inputPath, string $outputPath, array $options): bool
//     { 
//         $command = [
//             $this->binaries['cwebp'],
//             '-q', $options['quality'], // Jakość
//             '-mt', // Wielowątkowość
//             '-quiet', // Bez wyjścia
//             $inputPath,
//             '-o', $outputPath
//         ];

//         return $this->runProcess($command);
//     }

//     /**
//      * Uruchamia proces zewnętrzny
//      * 
//      * @param array $command Komenda do uruchomienia
//      * @return bool Czy proces zakończył się sukcesem
//      */
//     private function runProcess(array $command): bool
//     {
//         try {
//             $process = new Process($command);
//             $process->setTimeout(60); // 60 sekund timeout
//             $process->run();

//             if (!$process->isSuccessful()) {
//                 throw new ProcessFailedException($process);
//             }

//             return true;
//         } catch (\Exception $e) {
//             error_log("Błąd podczas uruchamiania procesu: " . $e->getMessage());
//             return false;
//         }
//     } 

//     /**
//      * Sprawdza, czy zewnętrzne narzędzia są używane 
//      * @return bool Czy zewnętrzne narzędzia są używane
//      */
//     public function isUsingExternalTools(): bool
//     {
//         return $this->useExternalTools;
//     } 
// }

