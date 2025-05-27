<?php

namespace App\Service\GraphicsToolsModule\UserImages\DTO;

use App\Service\GraphicsToolsModule\Workflow\Abstract\AbstractDTO;

class UserStorageInfo extends AbstractDTO
{
    public function __construct(
        public float $maxDiscStorage,
        public string $discStorageUnit,
        public float $currentDiscStorage,
        public float $currentDiscStoragePercent 
    ) {}
}