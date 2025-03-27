<?php

namespace App\Service\GraphicsToolsModule\MessageHandler;

use App\Service\GraphicsToolsModule\Compressor\CompressionProcess;
use App\Service\GraphicsToolsModule\Compressor\CompressionProcessHandler;
use App\Service\GraphicsToolsModule\Message\ImageProcessingMessage;
use Symfony\Component\Messenger\Handler\MessageHandlerInterface; 
use Psr\Log\LoggerInterface;
use App\Entity\GTMImage; 
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
class ImageProcessingMessageHandler implements MessageHandlerInterface
{ 
    public function __construct(private LoggerInterface $logger) { }

    public function __invoke(ImageProcessingMessage $message)
    {
        $processHash = $message->getProcessHash();
        $imagePath = $message->getImagePath();
        $userId = $message->getUserId();
        $originalName = $message->getOriginalName();
        $mimeType = $message->getOriginalName();
        $operation = $message->getOperation(); 

        try {  
            match ($operation) {
                GTMImage::OPERATION_COMPRESSION => $this->compressionProcess->start($processHash, $userId, $imagePath, $originalName, $mimeType),
                // GTMImage::OPERATION_CONVERSION =>  ,
                default => throw new \InvalidArgumentException("Nieznana operacja: $operation")
            }; 
        } catch (\Exception $e) {
            $this->logger->error('Błąd podczas uruchamiania operacji', [
                'processHash' => $processHash,
                'operation' => $operation,
                'error' => $e->getMessage()
            ]);
        }
    }
}
