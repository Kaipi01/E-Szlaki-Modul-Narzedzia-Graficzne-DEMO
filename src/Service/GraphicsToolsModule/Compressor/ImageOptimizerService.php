<?php

declare(strict_types=1);

namespace App\Service\GraphicsToolsModule\Compressor;

use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageOptimizerInterface;
use Spatie\ImageOptimizer\Optimizers\{Cwebp, Jpegoptim, Pngquant};
use Spatie\ImageOptimizer\OptimizerChainFactory;
use Exception;

class ImageOptimizerService implements ImageOptimizerInterface
{ 
    /** @inheritDoc */
    public function optimize(string $imagePath, int $quality = 80): void
    {
        if (!file_exists($imagePath)) {
            throw new Exception("Plik nie istnieje: $imagePath");
        }
        $optimizerChain = OptimizerChainFactory::create();

        if ($quality < 1 || $quality > 100) {
            $quality = 80;
        }

        $optimizerChain
            ->addOptimizer(new Jpegoptim([
                '--strip-all',
                '--all-progressive',
                "--max=$quality"
            ]))
            ->addOptimizer(new Pngquant([
                '--force',
                "--quality=$quality",
                '--strip',
                '--verbose'
            ]))
            ->addOptimizer(new Cwebp([
                '-m 6',
                "-q $quality",
                '-mt',
                '-quiet'
            ]));

        $optimizerChain->optimize($imagePath);
    }
} 