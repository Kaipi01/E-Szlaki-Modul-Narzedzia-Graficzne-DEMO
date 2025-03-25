<?php

namespace App\Service\GraphicsToolsModule\Message;

class ImageProcessingMessage
{  
    public function __construct( 
        private string $operation,
        private string $processHash,
        private string $imagePath,
        private int $userId,
        private string $originalName,
        private string $mimeType
    ) { }  

    public function getOperation(): string
    {
        return $this->operation;
    }  

	public function getProcessHash(): string {
		return $this->processHash;
	}
    
	public function getImagePath(): string {
		return $this->imagePath;
	}
    
	public function getUserId(): int {
		return $this->userId;
	}
    
	public function getOriginalName(): string {
		return $this->originalName;
	}
    
	public function getMimeType(): string {
		return $this->mimeType;
	}
}
