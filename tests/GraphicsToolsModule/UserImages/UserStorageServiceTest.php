<?php

declare(strict_types=1);

namespace App\Tests\Service\GraphicsToolsModule\UserImages;

use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\UserImages\DTO\UserStorageInfo;
use App\Service\GraphicsToolsModule\UserImages\UserStorageService;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Filesystem\Exception\FileNotFoundException;

class UserStorageServiceTest extends TestCase
{
    private UserStorageService $service;
    private string $testFolder;

    protected function setUp(): void
    {
        $this->testFolder = sys_get_temp_dir() . '/123';

        // Tworzymy tymczasowy folder z plikami
        if (!is_dir($this->testFolder)) {
            mkdir($this->testFolder);
        }

        file_put_contents($this->testFolder . '/image1.jpg', str_repeat('a', 1_000_000)); // 1 MB
        file_put_contents($this->testFolder . '/image2.jpg', str_repeat('a', 500_000));  // 0.5 MB
 
        $repo = $this->createMock(GTMImageRepository::class);
        $logger = $this->createMock(GTMLoggerInterface::class);
        $kernel = $this->createMock(KernelInterface::class);

        $container = $this->createMock(ContainerInterface::class);
        $container->method('getParameter')
            ->with('gtm_uploads')
            ->willReturn(dirname($this->testFolder)); // np. /tmp

        $this->service = new UserStorageService($repo, $logger, $kernel, $container);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->testFolder . '/*'));
        rmdir($this->testFolder);
    }

    public function testGetUserFolderSize(): void
    {
        $size = $this->service->getUserFolderSize(123);

        $this->assertGreaterThan(1_400_000, $size); // Zapas na metadane itp.
        $this->assertLessThan(1_600_000, $size);
    }

    public function testIsUserHaveEnoughSpace(): void
    {
        $result = $this->service->isUserHaveEnoughSpace(123, 1_000_000); // Dodajemy 1MB

        $this->assertTrue($result); // Bo limit to 500MB
    }

    public function testIsUserHaveNotEnoughSpace(): void
    {
        $tooBig = 600 * 1_048_576; // 600 MB
        $result = $this->service->isUserHaveEnoughSpace(123, $tooBig);

        $this->assertFalse($result);
    }

    public function testGetUserStorageData(): void
    {
        $dto = $this->service->getUserStorageData(123);

        $this->assertInstanceOf(UserStorageInfo::class, $dto);
        $this->assertSame('MB', $dto->discStorageUnit);
        $this->assertGreaterThan(1.0, $dto->currentDiscStorage);
        $this->assertLessThan(2.0, $dto->currentDiscStorage);
    }

    public function testExceptionOnMissingFolder(): void
    {
        $this->expectException(FileNotFoundException::class);
        $this->service->getUserFolderSize(999); // Brak folderu /tmp/999
    }
}
