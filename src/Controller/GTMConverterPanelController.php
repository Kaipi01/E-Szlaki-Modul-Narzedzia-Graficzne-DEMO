<?php 

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route(path: '/profil')]
class GTMConverterPanelController extends AbstractController
{
    #[Route(path: '/narzedzia-graficzne/konwerter', name: 'gtm_converter_panel')]
    public function index(): Response
    {  
        return $this->render('graphics_tools_module/converter_panel/index.html.twig', [
            'GET_IMAGE_DATA_URL' => GTMImageDataAPIController::GET_IMAGE_DATA_URL
        ]);
    }
}
