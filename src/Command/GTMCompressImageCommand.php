<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\GTMImage;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\Utils\Uuid;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class GTMCompressImageCommand extends Command
{
    protected static $defaultName = 'gtm:compress-image';
    protected static $defaultDescription = 'Kompresuje obraz';

    public function __construct(
        private CompressorInterface $compressor,
        private GTMLoggerInterface $logger,
        private ImageEntityManagerInterface $imageManager,
        private string $uploadsDir
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->setDescription(self::$defaultDescription)
            ->addOption(
                'path',
                'p',
                InputOption::VALUE_REQUIRED,
                'Ścieżka do obrazu do kompresji'
            )
            ->addOption(
                'userId',
                'id',
                InputOption::VALUE_REQUIRED,
                'ID Użytkownika'
            )
            ->addOption(
                'processHash',
                'ha',
                InputOption::VALUE_OPTIONAL,
                'Hash Operacji'
            )
            ->addOption(
                'removeOrigin',
                'rm',
                InputOption::VALUE_OPTIONAL,
                'Czy usunąć orginał?'
            )
            ->addOption(
                'quality',
                'qu',
                InputOption::VALUE_OPTIONAL,
                'Jakość kompresji'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $processHash = $input->getOption('processHash') ?? Uuid::generate();
        $tempPath = $input->getOption('path');
        $userId = $input->getOption('userId');
        $quality = $input->getOption('quality') ?? 80;
        $isRemoveOrigin = $input->getOption('removeOrigin');
        $originalName = basename($tempPath);

        try {
            $destinationDir = "{$this->uploadsDir}/$userId";

            if (!is_dir($destinationDir)) {
                mkdir($destinationDir, 0755, true);
            }

            $destinationPath = "$destinationDir/$originalName";

            copy($tempPath, $destinationPath);
            
            $compressionResults = $this->compressor->compress($destinationPath, (int) $quality);

            $this->imageManager->save(
                [
                    'src' => $destinationPath,
                    'originalName' => $originalName,
                    'operationHash' => $processHash,
                    'operationResults' => $compressionResults->toArray(),
                    'operationType' => GTMImage::OPERATION_COMPRESSION
                ],
                (int) $userId
            );
    
            if ($isRemoveOrigin) {
                unlink($tempPath);
            }

            $output->writeln("Kompresja zakończona pomyślnie");

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas kompresji obrazu', [
                'processHash' => $processHash,
                'error' => $e->getMessage()
            ]);

            $output->writeln("<error>Błąd: {$e->getMessage()}</error>");

            return Command::FAILURE;
        }
    }
}