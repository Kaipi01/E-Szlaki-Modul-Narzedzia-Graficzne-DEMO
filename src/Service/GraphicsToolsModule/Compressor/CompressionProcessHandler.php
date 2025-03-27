<?php 

namespace App\Service\GraphicsToolsModule\Compressor;
 
use App\Service\GraphicsToolsModule\Utils\DTO\ImageProcessData;
use App\Service\GraphicsToolsModule\Compressor\Contracts\CompressorInterface;
use App\Service\GraphicsToolsModule\Compressor\DTO\CompressionResults;
use App\Service\GraphicsToolsModule\Compressor\Contracts\ImageEntityManagerInterface;
use App\Service\GraphicsToolsModule\Utils\DTO\ImageOperationStatus;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class CompressionProcessHandler implements \Serializable
{
    private ?CompressionResults $compressionResults = null;
    private ?UploadedFile $image = null;
    private ?CompressorInterface $compressor = null;
    private ?ImageEntityManagerInterface $imageManager = null;
    private int $ownerId;
    private ?string $destinationPath = null;
    private ?string $compressedDir = null;
    private string $processHash; 
    private ?string $imagePath = null;
    private ?string $imageMimeType = null;
    private ?string $imageOriginalName = null;
    private ?array $serializedCompressionResults = null;
    
    public function __construct(array $config)
    {
        $this->processHash = $config['processHash'];
        $this->image = $config['image'] ?? null;
        $this->compressor = $config['compressor'] ?? null;
        $this->imageManager = $config['imageManager'] ?? null; 
        $this->compressedDir = $config['compressedDir'] ?? null;
        $this->ownerId = $config['ownerId'] ?? 0;
        
        // Zapisz informacje o obrazie, jeśli istnieje
        if ($this->image instanceof UploadedFile) {
            $this->imagePath = $this->image->getRealPath();
            $this->imageMimeType = $this->image->getMimeType();
            $this->imageOriginalName = $this->image->getClientOriginalName();
        }
        
        // Przywróć ścieżkę docelową, jeśli istnieje
        if (isset($config['destinationPath'])) {
            $this->destinationPath = $config['destinationPath'];
        }
        
        // Przywróć wyniki kompresji, jeśli istnieją
        if (isset($config['compressionResults'])) {
            if ($config['compressionResults'] instanceof CompressionResults) {
                $this->compressionResults = $config['compressionResults'];
            } elseif (is_array($config['compressionResults'])) {
                $this->compressionResults = CompressionResults::fromArray($config['compressionResults']);
            }
        }
    } 
    
    public function prepareImage(): ImageProcessData
    {
        $processData = ImageProcessData::fromArray([
            'processHash' => $this->processHash,
            'status' => ImageOperationStatus::PREPARING,
            'progress' => 40
        ]);


        // Jeśli mamy już ścieżkę docelową i plik istnieje, pomijamy kopiowanie
        if ($this->destinationPath && file_exists($this->destinationPath)) {
            return $processData; 
        }
        
        // Sprawdź, czy mamy obiekt obrazu lub ścieżkę do obrazu
        if (!$this->image instanceof UploadedFile && !$this->imagePath) {
            throw new \RuntimeException('Brak pliku obrazu do przetworzenia.');
        }
        
        // Użyj ścieżki z obiektu UploadedFile lub z zapisanej ścieżki
        $imagePath = $this->image instanceof UploadedFile ? $this->image->getRealPath() : $this->imagePath;
        
        if (!$imagePath || !file_exists($imagePath)) {
            throw new \RuntimeException('Nie można odnaleźć pliku obrazu.');
        }
        
        $destinationDir = "{$this->compressedDir}/{$this->ownerId}";

        if (!is_dir($destinationDir)) {
            if (!mkdir($destinationDir, 0755, true)) {
                throw new \RuntimeException('Nie można utworzyć katalogu docelowego.');
            }
        }

        // Użyj oryginalnej nazwy pliku z obiektu UploadedFile lub z zapisanej nazwy
        $originalName = $this->image instanceof UploadedFile ? 
            $this->image->getClientOriginalName() : 
            $this->imageOriginalName;
            
        $this->destinationPath = $destinationDir . "/" . $originalName;

        if (!copy($imagePath, $this->destinationPath)) {
            throw new \RuntimeException('Nie udało się skopiować pliku.');
        }
        
        // Usuwamy oryginał tylko jeśli kopia się powiodła
        unlink($imagePath);

        return $processData;
    }

    public function compressImage(): ImageProcessData
    {
        if (!$this->compressor) {
            throw new \RuntimeException('Brak komponentu kompresora.');
        }
        
        if (!$this->destinationPath || !file_exists($this->destinationPath)) {
            throw new \RuntimeException('Nie znaleziono pliku do kompresji. Wykonaj najpierw krok przygotowania obrazu.');
        }
        
        // Użyj zapisanego typu MIME
        $mimeType = $this->imageMimeType ?? 'image/jpeg';
        
        $this->compressionResults = $this->compressor->compress($this->destinationPath, $mimeType);

        return ImageProcessData::fromArray([
            'processHash' => $this->processHash,
            'status' => ImageOperationStatus::PROCESSING,
            'progress' => 80
        ]);
    }

    public function saveImage(): ImageProcessData
    {
        if (!$this->imageManager) {
            throw new \RuntimeException('Brak komponentu zarządzania obrazami.');
        }
        
        if (!$this->compressionResults) {
            throw new \RuntimeException('Brak wyników kompresji. Wykonaj najpierw krok kompresji obrazu.');
        }
        
        $this->imageManager->saveAsCompressed(
            $this->compressionResults,
            $this->processHash,
            $this->ownerId
        );

        return ImageProcessData::fromArray([
            'processHash' => $this->processHash,
            'status' => ImageOperationStatus::PROCESSING,  
            'progress' => 90 
        ]);
    }

    /** Serializuj obiekt - zapisuje tylko niezbędne dane */
    public function serialize(): string
    {
        return serialize([
            'processHash' => $this->processHash,
            'destinationPath' => $this->destinationPath,
            'imagePath' => $this->imagePath,
            'imageMimeType' => $this->imageMimeType,
            'imageOriginalName' => $this->imageOriginalName,
            'ownerId' => $this->ownerId,
            // Serializuj CompressionResults jeśli istnieje
            'compressionResults' => $this->compressionResults ? $this->compressionResults->toArray() : null
        ]);
    }
    
    /** Deserializuj obiekt - tylko podstawowe dane, zależności będą wstrzykiwane później */
    public function unserialize($data)
    {
        $unserialized = unserialize($data);
        
        $this->processHash = $unserialized['processHash'];
        $this->destinationPath = $unserialized['destinationPath'];
        $this->imagePath = $unserialized['imagePath'];
        $this->imageMimeType = $unserialized['imageMimeType'];
        $this->imageOriginalName = $unserialized['imageOriginalName'];
        // OwnerId będzie użyte do wstrzyknięcia właściciela
        $this->ownerId = $unserialized['ownerId'];
        // CompressionResults będzie odtworzone później
        $this->serializedCompressionResults = $unserialized['compressionResults'];
    }
    
    /** Wstrzykuje zależności po deserializacji */
    public function injectDependencies(
        CompressorInterface $compressor,
        ImageEntityManagerInterface $imageManager,
        string $compressedDir,
        int $ownerId
    ): void {
        $this->compressor = $compressor;
        $this->imageManager = $imageManager;
        $this->compressedDir = $compressedDir;
        $this->ownerId = $ownerId;
        
        // Odtwórz CompressionResults jeśli istnieje
        if ($this->serializedCompressionResults) {
            $this->compressionResults = CompressionResults::fromArray($this->serializedCompressionResults);
            unset($this->serializedCompressionResults);
        }
    }
}
