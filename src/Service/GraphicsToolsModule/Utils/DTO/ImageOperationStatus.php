<?php 

namespace App\Service\GraphicsToolsModule\Utils\DTO;

class ImageOperationStatus
{
    public const PENDING = 'pending';
    public const PREPARING = 'preparing';
    public const PROCESSING = 'processing';
    public const COMPLETED = 'completed';
    public const FAILED = 'failed';
}