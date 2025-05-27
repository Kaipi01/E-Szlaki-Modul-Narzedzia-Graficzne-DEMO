<?php

namespace App\Service\GraphicsToolsModule\Editor\DTO;

use App\Service\GraphicsToolsModule\Workflow\Abstract\AbstractDTO;

class ResizeImageOptions extends AbstractDTO
{
    public const RESIZE_BY_PERCENT = "percent";
    public const RESIZE_BY_WIDTH = "width";
    public const RESIZE_BY_HEIGHT = "height";

    public function __construct(
        public string $resizeBy,
        public ?int $width = null,
        public ?int $height = null,
        public ?int $percent = null,
    ) {}
}