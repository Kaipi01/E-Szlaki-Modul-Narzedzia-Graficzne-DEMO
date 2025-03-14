<?php

namespace App\Command;

use App\Entity\GTMImage;
use App\Service\GraphicsToolsModule\Compressor\Contracts\TrackCompressionProgressInterface;
use Doctrine\ORM\EntityManagerInterface;
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

    public function __construct(
        private EntityManagerInterface $entityManager,
        private TrackCompressionProgressInterface $compressionTracker,
        string $projectDir
    ) {
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
        $compressedDir = "{$this->projectDir}/public/graphics-tools-module/uploads/compressed";
        $tempDir = "{$this->projectDir}/public/graphics-tools-module/uploads/temp";

        $cleanAll = $input->getOption('all');
        $cleanTemp = $input->getOption('temp');
        $clearCount = 0;

        if ($cleanAll || $cleanTemp) {
            $clearCount = $this->compressionTracker->cleanupOldProgressFiles(0);
        }

        if ($cleanAll) {
            $this->clearDataBase();
            $output->writeln("Wyczyszczono informacje o grafikach w bazie danych");
            $this->clearDirectory($compressedDir, $filesystem, $output);
            $this->clearDirectory($tempDir, $filesystem, $output);
        } elseif ($cleanTemp) {
            $this->clearDirectory($tempDir, $filesystem, $output);
        } else {
            $output->writeln('Nie wybrano żadnej opcji. Użyj --all lub --temp.');
            return Command::FAILURE;
        }

        $output->writeln('Zakończono czyszczenie folderów obrazów.');
        $output->writeln("Liczba wyczyszczonych plików: $clearCount");

        return Command::SUCCESS;
    }

    private function clearDirectory(string $directory, Filesystem $filesystem, OutputInterface $output): void
    {
        if ($filesystem->exists($directory)) {
            $finder = new Finder();
            $finder->files()->in($directory);

            foreach ($finder as $file) {
                $filesystem->remove($file->getRealPath());
            }

            $output->writeln("Wyczyszczono katalog: $directory");
        } else {
            $output->writeln("Katalog nie istnieje: $directory");
        }
    }

    private function clearDataBase(): void
    {
        $allJobs = $this->entityManager->getRepository(GTMImage::class)->findAll();

        foreach ($allJobs as $job) {
            $this->entityManager->remove($job);
        }
        $this->entityManager->flush();
    }
}
