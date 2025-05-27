<?php

namespace App\Controller;

use App\Repository\GTMImageRepository;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use App\Service\GraphicsToolsModule\UserImages\Contracts\UserStorageInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class GTMMainPanelController extends AbstractController
{
    #[Route(path: '/profil/narzedzia-graficzne', name: 'gtm_main_panel')]
    public function index(GTMImageRepository $imageRepository, UserStorageInterface $storageService): Response
    {
        $user = $this->getUser();

        $userImages = $imageRepository->findBy(['owner' => $user], ['uploadedAt' => 'desc']); 

        $userStorageData = $storageService->getUserStorageData($user->getId());

        return $this->render('graphics_tools_module/main_panel/index.html.twig', [
            'userImages' => $userImages,
            'userMaxDiscStorage' => $userStorageData->maxDiscStorage,
            'discStorageUnit' => $userStorageData->discStorageUnit,
            'userCurrentDiscStorage' => $userStorageData->currentDiscStorage,
            'userCurrentDiscStoragePercent' => $userStorageData->currentDiscStoragePercent
        ]);
    }
}
