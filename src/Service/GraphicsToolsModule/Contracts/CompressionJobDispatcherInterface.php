<?php 

namespace App\Service\GraphicsToolsModule\Contracts;

interface CompressionJobDispatcherInterface
{
    public function dispatch(int $jobId): void;
}