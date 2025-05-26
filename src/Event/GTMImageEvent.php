<?php

namespace App\Event;

use Symfony\Contracts\EventDispatcher\Event;

class GTMImageEvent extends Event
{
    public const IMAGE_CREATED = 'gtm_image.created';
    public const IMAGE_UPDATED = 'gtm_image.updated';
    public const IMAGE_DELETED = 'gtm_image.deleted';

    public function __construct(private int $userId)
    {
    } 

    public function getUserId(): int
    {
        return $this->userId;
    }
}