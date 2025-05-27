<?php

namespace App\Controller;

use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\UserImages\UserImagesPanelService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use App\Service\GraphicsToolsModule\Utils\Contracts\ImageEntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Security;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use App\Repository\GTMImageRepository;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\GTMImage;
use Exception;

#[Route(path: '/profil')]
class GTMUserImagesPanelController extends AbstractController
{
    private const CACHE_TTL = 600; // 10 minut

    public function __construct(
        private readonly GTMImageRepository $imageRepository,
        private readonly GTMLoggerInterface $logger,
        private readonly CacheInterface $cache,
        private readonly Security $security,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserImagesPanelService $service,
        private readonly ImageEntityManagerInterface $imageManager
    ) {
    }

    #[Route(path: '/narzedzia-graficzne/moje-grafiki', name: 'gtm_user_images_panel')]
    public function index(): Response
    {
        return $this->render('graphics_tools_module/user_images_panel/index.html.twig', [
            'GET_USER_IMAGES_JSON' => '/profil/narzedzia-graficzne/moje-grafiki/pobierz-json',
            'REMOVE_USER_IMAGE_JSON' => '/profil/narzedzia-graficzne/moje-grafiki/usun-grafike-json/',
            'REMOVE_ALL_USER_IMAGES_JSON' => '/profil/narzedzia-graficzne/moje-grafiki/usun-wszystkie-json',
        ]);
    }

    #[Route(path: '/narzedzia-graficzne/moje-grafiki/usun-wszystkie-json', name: 'gtm_remove_all_user_images_json', methods: [Request::METHOD_DELETE])]
    public function removeAllUserImagesJSON(): JsonResponse
    {
        $jsonData = [];
        $status = Response::HTTP_OK;
        $user = $this->getUser();

        try {
            if (!$user) {
                $status = Response::HTTP_UNAUTHORIZED;
                throw new Exception('Odmowa dostępu!');
            }

            $images = $this->imageRepository->findBy(['owner' => $user]);

            if (empty($images)) {
                return $this->json(['success' => true, 'error' => '', 'deletedCount' => 0], $status);
            }

            $this->imageManager->removeAll($images, $user->getId());

            $jsonData = [
                'success' => true,
                'error' => '',
                'deletedCount' => count($images)
            ];
        } catch (Exception $e) {
            $status = $status === Response::HTTP_OK ? Response::HTTP_INTERNAL_SERVER_ERROR : $status;
            $jsonData = [
                'success' => false,
                'error' => 'Wystąpił błąd podczas usuwania grafik: ' . $e->getMessage(),
                'deletedCount' => 0
            ];
            $this->logger->error(__METHOD__ . ': ' . $e->getMessage());
        }

        return $this->json($jsonData, $status);
    }

    #[Route(path: '/narzedzia-graficzne/moje-grafiki/usun-grafike-json/{id}', name: 'gtm_remove_user_image_json', methods: [Request::METHOD_DELETE])]
    public function removeImageJSON(string $id): JsonResponse
    {
        $jsonData = [];
        $status = Response::HTTP_OK;
        $user = $this->getUser();

        try {
            $imageId = $this->service->validateInt($id);

            if (!$user) {
                $status = Response::HTTP_UNAUTHORIZED;
                throw new Exception('Odmowa dostępu!');
            }

            /** @var GTMImage */
            $image = $this->imageRepository->findOneBy(['owner' => $user, 'id' => $imageId]);

            if (!$image) {
                $status = Response::HTTP_NOT_FOUND;
                throw new Exception('Nie znaleziono takiej grafiki!');
            }

            $imageName = $image->getName();

            $this->imageManager->remove($image, $user->getId());

            $jsonData = [
                'success' => true,
                'error' => '',
                'imageName' => $imageName
            ];

        } catch (Exception $e) {
            $status = $status === Response::HTTP_OK ? Response::HTTP_INTERNAL_SERVER_ERROR : $status;
            $jsonData = [
                'success' => false,
                'error' => 'Wystąpił błąd podczas usuwania: ' . $e->getMessage(),
                'imageName' => ''
            ];
            $this->logger->error(__METHOD__ . ': ' . $e->getMessage());
        }

        return $this->json($jsonData, $status);
    }

    #[Route(path: '/narzedzia-graficzne/moje-grafiki/pobierz-json', name: 'gtm_get_user_images_json', methods: [Request::METHOD_GET])]
    public function getUserImagesJSON(Request $request): JsonResponse
    {
        $query = $request->query;
        $page = $this->service->validatePage($query->get('page', '1'));
        $perPage = $this->service->validatePerPage($query->get('perPage', '12'));
        $search = $this->service->sanitizeSearchTerm($query->get('search', ''));
        $dateFilter = $this->service->validateDateFilter($query->get('date', 'all'));
        $sortBy = $this->service->validateSortOption($query->get('sortBy', 'date-desc'));

        $user = $this->getUser();

        if (!$user) {
            return $this->json(['error' => 'Użytkownik nie jest zalogowany'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $cacheKey = $this->service->generateCacheKey($user->getId(), $page, $perPage, $search, $dateFilter, $sortBy);

            $cacheMissCallback = function (ItemInterface $item) use ($user, $page, $perPage, $search, $dateFilter, $sortBy) {
                $item->expiresAfter(self::CACHE_TTL);

                $queryBuilder = $this->service->buildQueryBuilder($user, $search, $dateFilter, $sortBy);

                $total = $this->service->countTotalResults($queryBuilder);

                $queryBuilder->setFirstResult(($page - 1) * $perPage)->setMaxResults($perPage);

                $images = $queryBuilder->getQuery()->getResult();

                return [
                    'images' => $this->prepareImagesData($images),
                    'total' => $total,
                    'page' => $page,
                    'perPage' => $perPage,
                    'hasMore' => ($page * $perPage) < $total,
                    'cached' => true,
                    'cachedAt' => (new \DateTime())->format('Y-m-d H:i:s')
                ];
            };

            $response = $this->cache->get($cacheKey, $cacheMissCallback);

            return $this->json($response);

        } catch (Exception $e) {
            $this->logger->error(__METHOD__ . ': Błąd podczas pobierania listy obrazów: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => [
                    'page' => $query->get('page'),
                    'perPage' => $query->get('perPage'),
                    'search' => $query->get('search'),
                    'date' => $query->get('date'),
                    'sortBy' => $query->get('sortBy')
                ]
            ]);

            return $this->json(
                ['error' => 'Wystąpił błąd podczas pobierania danych. Spróbuj ponownie później.'],
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Przygotowuje dane obrazów do formatu JSON
     * @param array $images - Tablica obiektów GTMImage
     * @return array - Tablica danych obrazów w formacie JSON
     */
    private function prepareImagesData(array $images): array
    {
        $imageData = [];
        $escapeHTML = fn(string|null $s) => $s ? htmlspecialchars($s, ENT_QUOTES, 'UTF-8') : null;

        /** @var GTMImage $image */
        foreach ($images as $image) {
            $imageData[] = [
                'id' => (int) $image->getId(),
                'name' => $escapeHTML($image->getName()),
                'src' => $escapeHTML($image->getSrc()),
                'thumbnailSrc' => $escapeHTML($image->getThumbnailSrc()),
                'size' => (int) $image->getSize(),
                'date' => $image->getUploadedAt()->format('Y-m-d H:i:s')
            ];
        }

        return $imageData;
    }

    /**
     * Invaliduje cały cache obrazów dla danego użytkownika
     * @param int $userId - ID użytkownika
     * @return void
     */
    public function invalidateUserImagesCache(int $userId): void
    {
        for ($page = 1; $page <= 5; $page++) {
            $this->cache->delete(
                $this->service->generateCacheKey($userId, $page, 12, '', 'all', 'date-desc')
            );
        }
    }
}