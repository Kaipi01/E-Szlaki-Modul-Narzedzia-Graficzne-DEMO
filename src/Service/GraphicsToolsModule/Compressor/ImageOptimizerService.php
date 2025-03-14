<?php

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageOptimizerInterface;
use Spatie\ImageOptimizer\OptimizerChainFactory;
use Spatie\ImageOptimizer\Optimizers\{Cwebp, Jpegoptim, Pngquant};
use Symfony\Component\Process\Process;

class ImageOptimizerService implements ImageOptimizerInterface
{
    public function optimize(string $mimeType, string $imagePath): void
    {
        if (!file_exists($imagePath)) {
            throw new \Exception("Plik nie istnieje: $imagePath"); 
        } 

        $optimizerChain = OptimizerChainFactory::create(); 

        $optimizerChain 
            ->addOptimizer(new Jpegoptim([
                '--strip-all',
                '--all-progressive',
                '--max=80'
            ]))
            ->addOptimizer(new Pngquant([
                '--force',
                '--quality=65-80',
                '--strip',
                '--verbose'
            ]))
            ->addOptimizer(new Cwebp([
                '-m 6',
                '-q 80',
                '-mt',
                '-quiet'
            ]));

        $optimizerChain->optimize($imagePath);  
    }

    private function optimizeByProcess(string $imagePath, array $processData): void
    { 
        array_push($processData, $imagePath);

        try {
            $process = new Process($processData);

            $process->run();

            if (!$process->isSuccessful()) {
                throw new \Exception('process failed: ' . $process->getErrorOutput()); 
            }
        } catch (\Exception $e) {
            throw new \Exception('Nie udalo się zoptymalizowac pliku: ' . $e->getMessage());
        }
    }
}