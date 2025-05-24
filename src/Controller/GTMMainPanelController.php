<?php

namespace App\Controller;

use App\Entity\GTMImage;
use App\Repository\GTMImageRepository;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class GTMMainPanelController extends AbstractController
{
    #[Route(path: '/profil/narzedzia-graficzne', name: 'gtm_main_panel')]
    public function index(GTMImageRepository $imageRepository): Response
    {
        /** @var GTMImage[] */
        $userImages = $imageRepository->findBy(['owner' => $this->getUser()]);
        $discStorageUnit = 'MB';
        $userMaxDiscStorage = 500;
        $userCurrentDiscStorage = 0;

        foreach ($userImages as $img) {
            // $userCurrentDiscStorage += $img->getSize() / 1_000_000_000;
            $userCurrentDiscStorage += $img->getSize() / 1_000_000; // jeśli GB to 
        }

        return $this->render('graphics_tools_module/main_panel/index.html.twig', [
            'userImages' => $userImages,
            'userMaxDiscStorage' => $userMaxDiscStorage,
            'discStorageUnit' => $discStorageUnit,
            'userCurrentDiscStorage' => round($userCurrentDiscStorage, 2),
            'userCurrentDiscStoragePercent' => ($userCurrentDiscStorage / $userMaxDiscStorage) * 100
        ]);
    }
}
