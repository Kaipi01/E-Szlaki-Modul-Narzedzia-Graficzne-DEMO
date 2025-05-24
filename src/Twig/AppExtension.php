<?php

namespace App\Twig;

use Symfony\Component\DependencyInjection\ContainerInterface;
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;

class AppExtension extends AbstractExtension
{   
    public function getFilters()
    {
        return [
            new TwigFilter('formatBytes', [$this, 'formatBytes']),
        ];
    }

    public function formatBytes($bytes, int $precision = 2): string
    {
        $size = ['B','kB','MB','GB','TB','PB','EB','ZB','YB'];
        $factor = floor((strlen($bytes) - 1) / 3);
        $bytesValue = $bytes / pow(1024, $factor);

        return sprintf("%.{$precision}f", $bytesValue) . " " . @$size[$factor];
    }
}