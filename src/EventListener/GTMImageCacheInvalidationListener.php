<?php

namespace App\EventListener;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use App\Controller\GTMUserImagesPanelController;
use App\Event\GTMImageEvent;

class GTMImageCacheInvalidationListener implements EventSubscriberInterface
{
    public function __construct(private readonly GTMUserImagesPanelController $imagesController)
    {
    }
    
    public static function getSubscribedEvents(): array
    {
        return [
            GTMImageEvent::IMAGE_CREATED => 'onImageChange',
            GTMImageEvent::IMAGE_UPDATED => 'onImageChange',
            GTMImageEvent::IMAGE_DELETED => 'onImageChange',
        ];
    }
    
    public function onImageChange(GTMImageEvent $event): void
    { 
        $this->imagesController->invalidateUserImagesCache($event->getUserId());
    }
}