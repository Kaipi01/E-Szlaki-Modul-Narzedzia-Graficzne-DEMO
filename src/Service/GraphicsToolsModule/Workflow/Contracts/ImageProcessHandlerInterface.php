<?php

namespace App\Service\GraphicsToolsModule\Workflow\Contracts;

use App\Service\GraphicsToolsModule\Workflow\DTO\ImageProcessData;

interface ImageProcessHandlerInterface
{
    public function prepare(): ImageProcessData;
    public function process(): ImageProcessData;
    public function finalize(): ImageProcessData;
    public function setState(&$state);
}