<?php

namespace App\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Finder\Finder;

class GTMClearGraphicsCommand extends Command
{
    protected static $defaultName = 'gtm:clear-graphics';
    private string $projectDir;

    public function __construct(string $projectDir)
    {
        $this->projectDir = $projectDir;
        parent::__construct();
    }

    protected function configure()
    {
        $this->setDescription('Czyści obrazy z folderów tymczasowych i/lub skompresowanych.')
            ->addOption(
                'all',
                null,
                InputOption::VALUE_NONE,
                'Czyści wszystkie obrazy z obydwu folderów (temp i compressed).'
            )
            ->addOption(
                'temp',
                null,
                InputOption::VALUE_NONE,
                'Czyści tylko obrazy z folderu tymczasowego.'
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $filesystem = new Filesystem();
        $compressedDir = $this->projectDir . '/public/graphics-tools-module/uploads/compressed';
        $tempDir = $this->projectDir . '/public/graphics-tools-module/uploads/temp';

        $cleanAll = $input->getOption('all');
        $cleanTemp = $input->getOption('temp');

        if ($cleanAll) {
            $this->cleanDirectory($compressedDir, $filesystem, $output);
            $this->cleanDirectory($tempDir, $filesystem, $output);
        } elseif ($cleanTemp) {
            $this->cleanDirectory($tempDir, $filesystem, $output);
        } else {
            $output->writeln('Nie wybrano żadnej opcji. Użyj --all lub --temp.');
            return Command::FAILURE;
        }

        $output->writeln('Zakończono czyszczenie folderów obrazów.');

        return Command::SUCCESS;
    }

    private function cleanDirectory(string $directory, Filesystem $filesystem, OutputInterface $output): void
    {
        if ($filesystem->exists($directory)) {
            $finder = new Finder();
            $finder->files()->in($directory);

            foreach ($finder as $file) {
                $filesystem->remove($file->getRealPath()); 
            }

            $output->writeln('Wyczyszczono katalog: ' . $directory);
        } else {
            $output->writeln('Katalog nie istnieje: ' . $directory);
        }
    }
}
