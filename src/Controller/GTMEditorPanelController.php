<?php 

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route(path: '/profil')]
class GTMEditorPanelController extends AbstractController
{
    #[Route(path: '/narzedzia-graficzne/edytor', name: 'gtm_editor_panel')]
    public function index(): Response
    {
        return $this->render('graphics_tools_module/editor_panel/index.html.twig', [
            'controller_name' => 'GTMEditorPanelController',
        ]);
    }
}
