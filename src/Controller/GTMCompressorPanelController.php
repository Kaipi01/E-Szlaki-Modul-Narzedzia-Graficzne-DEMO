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
        return $this->render('graphics_tools_module/compressor_panel/index.html.twig', [
            'GET_IMAGE_DATA_URL' => GTMImageDataAPIController::GET_IMAGE_DATA_URL
        ]);
    }
}
