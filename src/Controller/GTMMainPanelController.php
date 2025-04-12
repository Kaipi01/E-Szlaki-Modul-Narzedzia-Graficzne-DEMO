<?php

namespace App\Controller;

use App\Repository\GTMImageRepository;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class GTMMainPanelController extends AbstractController
{
    #[Route(path: '/profil/narzedzia-graficzne', name: 'gtm_main_panel')]
    public function index(GTMImageRepository $imageRepository): Response
    {
        $userImages = $imageRepository->findBy(['owner' => $this->getUser()]);

        return $this->render('graphics_tools_module/main_panel/index.html.twig', [
            'userImages' => $userImages,
        ]);
    }
}
