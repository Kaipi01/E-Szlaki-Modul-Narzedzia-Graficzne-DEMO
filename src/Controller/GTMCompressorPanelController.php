<?php 

namespace App\Controller;
 
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route(path: '/profil')]
class GTMCompressorPanelController extends AbstractController
{ 
    #[Route(path: '/narzedzia-graficzne/kompresor', name: 'gtm_compressor_panel')]
    public function index(): Response
    { 
        // phpinfo();

        // php -c "D:\xampp\php\php.ini" -v
         
        // if (extension_loaded('imagick')) {
        //     dump("Imagick jest zainstalowany i załadowany.\n");
        //     $imagick = new \Imagick();
        //     dump($imagick);
        // } else {
        //     dump("Imagick nie jest zainstalowany lub nie został załadowany.\n");
        // }

        return $this->render('graphics_tools_module/compressor_panel/index.html.twig', [ 
            'TRACK_COMPRESSION_PROGRESS_URL' => GTMCompressorSSEController::TRACK_COMPRESSION_PROGRESS_URL,
            'GET_COMPRESSION_STATUS_URL' => GTMCompressorSSEController::GET_COMPRESSION_STATUS_URL, 
            'GET_IMAGE_DATA_URL' => GTMCompressorAPIController::GET_IMAGE_DATA_URL
        ]);
    }
}
