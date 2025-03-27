<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\GTMImage;
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

    public function __construct(
        private EntityManagerInterface $entityManager,
        private string $compressedDir,
        private string $uploadsTmpDir,
        private string $projectDir
    ) { 
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

        $cleanAll = $input->getOption('all');
        $cleanTemp = $input->getOption('temp'); 

        $this->clearDevLog($output);

        if ($cleanAll) {
            $this->clearDataBase();
            $output->writeln("Wyczyszczono informacje o grafikach w bazie danych");
            $this->clearDirectory($this->compressedDir, $filesystem, $output);
            $this->clearDirectory($this->uploadsTmpDir, $filesystem, $output);
        } elseif ($cleanTemp) {
            $this->clearDirectory($this->uploadsTmpDir, $filesystem, $output);
        } else {
            $output->writeln('Nie wybrano żadnej opcji. Użyj --all lub --temp.');
            return Command::FAILURE;
        }

        $output->writeln('Zakończono czyszczenie folderów obrazów.'); 

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

    /** Czyści plik dziennika dev.log w Symfony */
    private function clearDevLog(OutputInterface $output): void
    {  
        $logFile = "{$this->projectDir}/var/log/dev.log";
        
        if (file_exists($logFile)) { 
            file_put_contents($logFile, '');
            $output->writeln("<info>Wyczyszczono plik dziennika: $logFile</info>");
        } else {
            $output->writeln("<comment>Plik dziennika nie istnieje: $logFile</comment>");
        }
    }

}
