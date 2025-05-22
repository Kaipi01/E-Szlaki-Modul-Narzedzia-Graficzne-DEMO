<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route(path: '/profil')]
class GTMUserImagesPanelController extends AbstractController
{

    #[Route(path: '/narzedzia-graficzne/moje-grafiki', name: 'gtm_user_images_panel')]
    public function index(): Response
    {
        return $this->render('graphics_tools_module/user_images_panel/index.html.twig');
    }
}