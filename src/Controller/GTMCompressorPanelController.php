<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route; 

class GTMCompressorPanelController extends AbstractController
{
    #[Route('/narzedzia-graficzne/kompresor', name: 'app_gtm_compressor_panel')]
    public function index(): Response
    {
        return $this->render('graphics_tools_module/compressor_panel/index.html.twig', [
            'controller_name' => 'GTMCompressorPanelController',
        ]);
    }
}
