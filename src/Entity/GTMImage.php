<?php

namespace App\Entity;

use App\Repository\GTMImageRepository; 
use DateTime;
use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass=GTMImageRepository::class)
 */
class GTMImage
{ 
    public const IMAGE_CREATED = 'gtm_image.created';
    public const IMAGE_UPDATED = 'gtm_image.updated';
    public const IMAGE_DELETED = 'gtm_image.deleted';
    public const OPERATION_COMPRESSION = 'compression';
    public const OPERATION_CONVERSION = 'conversion';
    public const OPERATION_EDITION = 'edition';

    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private int $id;  

    /**
     * @ORM\Column(type="json", nullable=true)
     */
    private ?array $operationResults = [];

    /**
     * @ORM\Column(type="datetime")
     */
    private DateTime $uploadedAt; 

    /**
     * @ORM\ManyToOne(targetEntity=User::class, inversedBy="uploadedGTMImages")
     * @ORM\JoinColumn(nullable=false)
     */
    private User $owner;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $src;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $mimeType;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $name;

    /**
     * @ORM\Column(type="string", length=255, nullable=true)
     */
    private $serverName;

    /**
     * @ORM\Column(type="integer")
     */
    private $size;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $operationType;

    /**
     * @ORM\Column(type="string", length=255)
     */
    private $operationHash; 

    public function __construct()
    {
        $this->uploadedAt = new DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }   

    public function getOperationResults(): ?array
    {
        return $this->operationResults;
    }

    public function setOperationResults(?array $operationResults): self
    {
        $this->operationResults = $operationResults;
        return $this;
    } 

    public function getUploadedAt()
    {
        return $this->uploadedAt;
    }

    public function setUploadedAt(DateTime $uploadedAt): self
    {
        $this->uploadedAt = $uploadedAt;
        return $this;
    } 

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): self
    {
        $this->owner = $owner;

        return $this;
    }

    /** zwraca ścieżkę relatywną */
    public function getSrc(): ?string
    {
        return $this->src;
    }

    /** wymaga ścieżki relatywnej */
    public function setSrc(string $src): self
    {
        $this->src = $src;

        return $this;
    }

    public function getMimeType(): ?string
    {
        return $this->mimeType;
    }

    public function setMimeType(string $mimeType): self
    {
        $this->mimeType = $mimeType;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getServerName(): ?string
    {
        return $this->serverName;
    }

    public function setServerName(string $serverName): self
    {
        $this->serverName = $serverName;

        return $this;
    }

    public function getSize(): ?int
    {
        return $this->size;
    }

    public function setSize(int $size): self
    {
        $this->size = $size;

        return $this;
    }

    public function getOperationType(): ?string
    {
        return $this->operationType;
    }

    public function setOperationType(string $operationType): self
    {
        $this->operationType = $operationType;

        return $this;
    }

    public function getOperationHash(): ?string
    {
        return $this->operationHash;
    }

    public function setOperationHash(string $operationHash): self
    {
        $this->operationHash = $operationHash;

        return $this;
    } 
}
