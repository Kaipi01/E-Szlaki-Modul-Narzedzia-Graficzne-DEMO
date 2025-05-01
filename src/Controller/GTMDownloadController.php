<?php 

namespace App\Controller;

use App\Entity\GTMImage;
use App\Repository\GTMImageRepository;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Routing\Annotation\Route;
use Exception;
use ZipArchive;

#[Route(path: '/profil')]
class GTMDownloadController extends AbstractController
{
    public function __construct(private GTMImageRepository $gtmImageRepository, private GTMLoggerInterface $logger, private KernelInterface $kernel) {}

    #[Route(path: '/narzedzia-graficzne/pobierz-grafike/{serverName}', name: 'gtm_download_image', methods: ['GET'])]
    public function downloadImage(string $serverName): Response
    {
        $plainTextHeader = ["Content-Type" => "text/plain"];
        $user = $this->getUser();

        if (! $user) {
            return new Response('Odmowa dostępu. Użytkownik nie jest zalogowany w systemie', 401, $plainTextHeader);
        }

        // Zabezpieczenie przed wprowadzeniem ../ w nazwie pliku
        if (str_contains($serverName, '..')) {
            return new Response('Nieprawidłowa nazwa pliku.', 400, $plainTextHeader);
        }
        /** @var GTMImage */
        $image = $this->gtmImageRepository->findOneBy(['serverName' => $serverName]);   
        $imagePath = $this->getParameter('gtm_uploads') . "/" . $user->getId() . "/$serverName"; 

        if (! $image || !file_exists($imagePath)) {
            return new Response('Grafika nie istnieje.', 404, $plainTextHeader);
        }

        return $this->file($imagePath, $image->getName());
    }

    /** Pobiera wszystkie grafiki w formie ZIP na podstawie hash-ów operacji */
    #[Route(path: '/narzedzia-graficzne/pobierz-wszystkie-grafiki', name: 'gtm_download_all_images', methods: ['POST'])]
    public function downloadAllImages(Request $request): Response
    {
        if (!$this->getUser()) {
            return new Response('Odmowa dostępu. Użytkownik nie jest zalogowany w systemie', 401);
        }

        $data = json_decode($request->getContent(), true);
        $imageHashes = $data['imageHashes'] ?? [];

        /** @var \App\Entity\GTMImage[]  */
        $images = $this->gtmImageRepository->findByOperationHashes($imageHashes); 

        if (empty($images)) {
            return new Response('Nie znaleziono plików.', 404);
        }
 
        $zipFileName = 'skompresowane-grafiki.zip';
        $zipFilePath = sys_get_temp_dir() . '/' . $zipFileName;
        $zip = new ZipArchive();

        $openZipResult = $zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        try {
            if ($openZipResult !== true) {
                throw new Exception("Nie udało się utworzyć archiwum ZIP");
            }

            foreach ($images as $image) {
                $imagePath = $this->kernel->getProjectDir() . "/public" . $image->getSrc();

                if (file_exists($imagePath)) {
                    $zip->addFile($imagePath, $image->getName());
                } else {
                    $this->logger->warning("Plik nie istnieje: $imagePath");
                }
            }

            $zip->close();

            $zipArchiveResponse =  $this->file($zipFilePath, $zipFileName);
            $zipArchiveResponse->setStatusCode(200);
            $zipArchiveResponse->headers->set('Content-Type', 'application/zip');

            register_shutdown_function(fn() => unlink($zipFilePath));

            return $zipArchiveResponse;
            
        } catch (Exception $e) {
            $this->logger->error($e->getMessage());

            return new Response($e->getMessage(), 500);
        }
    }
}
