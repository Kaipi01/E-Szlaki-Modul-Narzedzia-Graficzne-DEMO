<?php
 
namespace App\Command;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Finder\Finder;

class CleanTempImagesCommand extends Command
{
    protected static $defaultName = 'app:clean-temp-images';
    private $projectDir;

    public function __construct(string $projectDir)
    {
        $this->projectDir = $projectDir;
        parent::__construct();
    }

    protected function configure()
    {
        $this->setDescription('Czyści tymczasowe obrazy starsze niż 24 godziny');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $tempDir = $this->projectDir . '/public/uploads/temp/';
        $cacheDir = $this->projectDir . '/public/media/cache/';

        if (!file_exists($tempDir)) {
            $output->writeln('Katalog tymczasowy nie istnieje.');
            return Command::SUCCESS;
        }

        // Czyszczenie plików tymczasowych
        $finder = new Finder();
        $finder->files()
            ->in($tempDir)
            ->date('< now - 1 day');

        $count = 0;
        foreach ($finder as $file) {
            unlink($file->getRealPath());
            $count++;
        }

        $output->writeln(sprintf('Usunięto %d tymczasowych plików.', $count));

        // Opcjonalnie: czyszczenie cache LiipImagineBundle
        // Uwaga: to usunie wszystkie pliki z cache, może być lepiej użyć wbudowanej komendy liip:imagine:cache:remove

        return Command::SUCCESS;
    }
}
