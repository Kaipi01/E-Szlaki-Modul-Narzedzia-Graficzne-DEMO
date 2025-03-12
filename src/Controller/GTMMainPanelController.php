<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/profil')]
class GTMMainPanelController extends AbstractController
{
    #[Route('/narzedzia-graficzne', name: 'gtm_main_panel')]
    public function index(): Response
    {
        return $this->render('graphics_tools_module/main_panel/index.html.twig', [
            'controller_name' => 'GTMMainPanelController',
        ]);
    }
}
