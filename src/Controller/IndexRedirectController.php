<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Routing\Annotation\Route;

/** 
 * Kontroler służący tylko do przekierowania do głównego panelu w module 
 * TODO: USUŃ
 */
class IndexRedirectController extends AbstractController
{
    #[Route(path: '/', name: 'app_index_redirect')]
    public function index(): RedirectResponse
    { 
        return $this->redirectToRoute('gtm_main_panel'); 
    }
}
