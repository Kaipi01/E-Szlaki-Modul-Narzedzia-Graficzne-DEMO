<?php

namespace App\Controller;

use App\Repository\GTMImageRepository;
use App\Entity\GTMImage;
use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Exception;

#[Route(path: '/profil')]
class GTMUserImagesPanelController extends AbstractController
{
    public function __construct(private readonly GTMImageRepository $imageRepository, private readonly GTMLoggerInterface $logger)
    {
    }

    #[Route(path: '/narzedzia-graficzne/moje-grafiki', name: 'gtm_user_images_panel')]
    public function index(): Response
    {
        return $this->render('graphics_tools_module/user_images_panel/index.html.twig', [
            'GET_USER_IMAGES_JSON' => '/profil/narzedzia-graficzne/moje-grafiki/pobierz-json'
        ]);
    } 

    #[Route(path: '/narzedzia-graficzne/moje-grafiki/pobierz-json', name: 'gtm_get_user_images_json')]
    public function getUserImagesJSON(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(50, (int) $request->query->get('perPage', 12)));
        $search = $request->query->get('search', '');
        $dateFilter = $request->query->get('date', 'all');
        $sortBy = $request->query->get('sortBy', 'date-desc');

        $user = $this->getUser();

        if (!$user) {
            return $this->json([
                'error' => 'Użytkownik nie jest zalogowany'
            ], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $queryBuilder = $this->buildQueryBuilder($user, $search, $dateFilter, $sortBy);

            $total = $this->countTotalResults($queryBuilder);

            $queryBuilder->setFirstResult(($page - 1) * $perPage)->setMaxResults($perPage);

            $images = $queryBuilder->getQuery()->getResult();

            return $this->json([
                'images' => $this->prepareImagesData($images),
                'total' => $total,
                'page' => $page,
                'perPage' => $perPage,
                'hasMore' => ($page * $perPage) < $total
            ]);

        } catch (Exception $e) {
            $this->logger->error(__METHOD__ . ': Błąd podczas pobierania listy obrazów: ' . $e->getMessage(), [
                'exception' => $e,
                'user' => $user?->getId()
            ]);

            return $this->json([
                'error' => 'Wystąpił błąd podczas pobierania danych. Spróbuj ponownie później.'
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Buduje zapytanie QueryBuilder na podstawie parametrów
     * 
     * @param object $user - Zalogowany użytkownik
     * @param string $search - Fraza wyszukiwania
     * @param string $dateFilter - Filtr daty ('all', 'today', 'week', 'month', 'year')
     * @param string $sortBy - Pole sortowania ('date-desc', 'date-asc', 'name-asc', 'name-desc', 'size-asc', 'size-desc')
     * @return QueryBuilder
     */
    private function buildQueryBuilder(object $user, string $search, string $dateFilter, string $sortBy): QueryBuilder
    { 
        $queryBuilder = $this->imageRepository
            ->createQueryBuilder('i')
            ->where('i.owner = :user')
            ->setParameter('user', $user);

        if (!empty($search)) {
            $queryBuilder
                ->andWhere('i.name LIKE :search')
                ->setParameter('search', '%' . $search . '%');
        }

        $this->applyDateFilter($queryBuilder, $dateFilter);

        $this->applySorting($queryBuilder, $sortBy);

        return $queryBuilder;
    }

    /**
     * Stosuje filtr daty do zapytania
     * 
     * @param QueryBuilder $queryBuilder - QueryBuilder do modyfikacji
     * @param string $dateFilter - Filtr daty ('all', 'today', 'week', 'month', 'year')
     * @return void
     */
    private function applyDateFilter(QueryBuilder $queryBuilder, string $dateFilter): void
    {
        $now = new \DateTime();

        switch ($dateFilter) {
            case 'today':
                $startDate = new \DateTime('today');
                $queryBuilder
                    ->andWhere('i.uploadedAt BETWEEN :startDate AND :endDate')
                    ->setParameter('startDate', $startDate)
                    ->setParameter('endDate', $now);
                break;
            case 'week':
                $startDate = new \DateTime('monday this week');
                $queryBuilder
                    ->andWhere('i.uploadedAt BETWEEN :startDate AND :endDate')
                    ->setParameter('startDate', $startDate)
                    ->setParameter('endDate', $now);
                break;
            case 'month':
                $startDate = new \DateTime('first day of this month');
                $queryBuilder
                    ->andWhere('i.uploadedAt BETWEEN :startDate AND :endDate')
                    ->setParameter('startDate', $startDate)
                    ->setParameter('endDate', $now);
                break;
            case 'year':
                $startDate = new \DateTime('first day of January this year');
                $queryBuilder
                    ->andWhere('i.uploadedAt BETWEEN :startDate AND :endDate')
                    ->setParameter('startDate', $startDate)
                    ->setParameter('endDate', $now);
                break;
            default:
                // 'all' - brak filtrowania po dacie
                break;
        }
    }

    /**
     * Stosuje sortowanie do zapytania
     * 
     * @param QueryBuilder $queryBuilder - QueryBuilder do modyfikacji
     * @param string $sortBy - Pole sortowania ('date-desc', 'date-asc', 'name-asc', 'name-desc', 'size-asc', 'size-desc')
     * @return void
     */
    private function applySorting(QueryBuilder $queryBuilder, string $sortBy): void
    {
        switch ($sortBy) {
            case 'date-asc':
                $queryBuilder->orderBy('i.uploadedAt', 'ASC');
                break;
            case 'date-desc':
                $queryBuilder->orderBy('i.uploadedAt', 'DESC');
                break;
            case 'name-asc':
                $queryBuilder->orderBy('i.name', 'ASC');
                break;
            case 'name-desc':
                $queryBuilder->orderBy('i.name', 'DESC');
                break;
            case 'size-asc':
                $queryBuilder->orderBy('i.size', 'ASC');
                break;
            case 'size-desc':
                $queryBuilder->orderBy('i.size', 'DESC');
                break;
            default:
                $queryBuilder->orderBy('i.uploadedAt', 'DESC');
                break;
        }
    }

    /**
     * Liczy całkowitą liczbę wyników
     * 
     * @param QueryBuilder $queryBuilder - QueryBuilder do liczenia wyników
     * @return int - Liczba wyników
     */
    private function countTotalResults(QueryBuilder $queryBuilder): int
    {
        $countQueryBuilder = clone $queryBuilder;
        return $countQueryBuilder->select('COUNT(i.id)')->getQuery()->getSingleScalarResult();
    }

    /**
     * Przygotowuje dane obrazów do formatu JSON
     * 
     * @param array $images - Tablica obiektów GTMImage
     * @return array - Tablica danych obrazów w formacie JSON
     */
    private function prepareImagesData(array $images): array
    {
        $imageData = [];

        /** @var GTMImage $image */
        foreach ($images as $image) {
            $imageData[] = [
                'id' => $image->getId(),
                'name' => $image->getName(),
                'src' => $image->getSrc(),
                'url' => $this->generateUrl('gtm_user_images_panel', ['id' => $image->getId()]),
                'size' => $image->getSize(),
                'date' => $image->getUploadedAt()->format('Y-m-d H:i:s'),
                'mimeType' => $image->getMimeType(),
                'operationType' => $image->getOperationType()
            ];
        }

        return $imageData;
    }
}