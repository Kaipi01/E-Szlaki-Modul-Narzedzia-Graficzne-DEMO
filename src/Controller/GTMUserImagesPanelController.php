<?php

namespace App\Controller;

use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use App\Service\GraphicsToolsModule\UserImagesPanel\UserImagesPanelService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Security;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use App\Repository\GTMImageRepository;
use App\Entity\GTMImage;
use Exception;
use Symfony\Contracts\Cache\TagAwareCacheInterface;

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
        private readonly UserImagesPanelService $service
    ) {
    }

    #[Route(path: '/narzedzia-graficzne/moje-grafiki', name: 'gtm_user_images_panel')]
    public function index(): Response
    {
        return $this->render('graphics_tools_module/user_images_panel/index.html.twig', [
            'GET_USER_IMAGES_JSON' => '/profil/narzedzia-graficzne/moje-grafiki/pobierz-json'
        ]);
    }

    #[Route(path: '/narzedzia-graficzne/moje-grafiki/usun-grafike-json', name: 'gtm_remove_user_image_json')]
    public function removeImageJSON(Request $request): JsonResponse
    {
        $imageId = $request->request->get('imageId');
        $jsonData = [];
        $status = Response::HTTP_OK;

        try {
            if (!$this->getUser()) {
                $status = Response::HTTP_UNAUTHORIZED;
                throw new Exception('Odmowa dostępu!');
            }

            if (!$imageId) {
                $status = Response::HTTP_BAD_REQUEST;
                throw new Exception('Nie podano ID grafiki!');
            }

            /** @var GTMImage */
            $image = $this->imageRepository->find($imageId);
            $imageName = $image->getName();

            $this->entityManager->remove($image);
            $this->entityManager->flush();

            $jsonData = [
                'success' => true,
                'error' => '',
                'imageName' => $imageName
            ];

        } catch (Exception $e) {
            $status = $status === Response::HTTP_OK ? Response::HTTP_INTERNAL_SERVER_ERROR : $status;
            $jsonData = [
                'success' => false,
                'error' => 'Wystąpił błąd podczas usuwania grafiki: ' . $e->getMessage(),
                'imageName' => ''
            ];
            $this->logger->error(__METHOD__ . ': ' . $e->getMessage());
        }

        return $this->json($jsonData, $status);
    }

    #[Route(path: '/narzedzia-graficzne/moje-grafiki/pobierz-json', name: 'gtm_get_user_images_json')]
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

        /** @var GTMImage $image */
        foreach ($images as $image) {
            $imageData[] = [
                'id' => (int) $image->getId(),
                'name' => htmlspecialchars($image->getName(), ENT_QUOTES, 'UTF-8'),
                'src' => htmlspecialchars($image->getSrc(), ENT_QUOTES, 'UTF-8'),
                'size' => (int) $image->getSize(),
                'date' => $image->getUploadedAt()->format('Y-m-d H:i:s'),
                'mimeType' => htmlspecialchars($image->getMimeType(), ENT_QUOTES, 'UTF-8'),
                'operationType' => htmlspecialchars($image->getOperationType(), ENT_QUOTES, 'UTF-8'),
                'operationResults' => $image->getOperationResults()
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
        // $this->cache->delete("user_images_$userId");

        for ($page = 1; $page <= 5; $page++) {
            $this->cache->delete(
                $this->service->generateCacheKey($userId, $page, 12, '', 'all', 'date-desc')
            );
        }
    }
}