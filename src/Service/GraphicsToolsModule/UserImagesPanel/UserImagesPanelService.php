<?php

namespace App\Service\GraphicsToolsModule\UserImagesPanel;

use App\Service\GraphicsToolsModule\Utils\Contracts\GTMLoggerInterface;
use Symfony\Component\String\UnicodeString;
use Symfony\Contracts\Cache\CacheInterface;
use App\Repository\GTMImageRepository;
use Doctrine\ORM\QueryBuilder;

class UserImagesPanelService
{
    public const ALLOWED_DATE_FILTERS = ['all', 'today', 'week', 'month', 'year'];
    public const ALLOWED_SORT_OPTIONS = [
        'date-asc',
        'date-desc',
        'name-asc',
        'name-desc',
        'size-asc',
        'size-desc'
    ];
    public const MAX_SEARCH_LENGTH = 50;

    public function __construct(
        private readonly GTMImageRepository $imageRepository,
        private readonly GTMLoggerInterface $logger,
        private readonly CacheInterface $cache
    ) {
    }

    /**
     * Generuje unikalny klucz cache na podstawie parametrów zapytania
     * @param int $userId - ID użytkownika
     * @param int $page - Numer strony
     * @param int $perPage - Liczba elementów na stronę
     * @param string $search - Fraza wyszukiwania
     * @param string $dateFilter - Filtr daty
     * @param string $sortBy - Sposób sortowania
     * @return string - Unikalny klucz cache
     */
    public function generateCacheKey(int $userId, int $page, int $perPage, string $search, string $dateFilter, string $sortBy): string
    {
        return sprintf(
            'user_images_%d_%d_%d_%s_%s_%s',
            $userId,
            $page,
            $perPage,
            md5($search),
            $dateFilter,
            $sortBy
        );
    }

    /**
     * Buduje zapytanie QueryBuilder na podstawie parametrów
     * @param object $user - Zalogowany użytkownik
     * @param string $search - Fraza wyszukiwania (już oczyszczona)
     * @param string $dateFilter - Filtr daty (już zwalidowany)
     * @param string $sortBy - Pole sortowania (już zwalidowane)
     * @return QueryBuilder
     */
    public function buildQueryBuilder(object $user, string $search, string $dateFilter, string $sortBy): QueryBuilder
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
     * @param QueryBuilder $queryBuilder - QueryBuilder do modyfikacji
     * @param string $dateFilter - Filtr daty (już zwalidowany)
     * @return void
     */
    public function applyDateFilter(QueryBuilder $queryBuilder, string $dateFilter): void
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
            case 'all':
            default:
                break;
        }
    }

    /**
     * Stosuje sortowanie do zapytania
     * @param QueryBuilder $queryBuilder - QueryBuilder do modyfikacji
     * @param string $sortBy - Pole sortowania (już zwalidowane)
     * @return void
     */
    public function applySorting(QueryBuilder $queryBuilder, string $sortBy): void
    {
        $sortMapping = [
            'date-asc' => ['field' => 'i.uploadedAt', 'direction' => 'ASC'],
            'date-desc' => ['field' => 'i.uploadedAt', 'direction' => 'DESC'],
            'name-asc' => ['field' => 'i.name', 'direction' => 'ASC'],
            'name-desc' => ['field' => 'i.name', 'direction' => 'DESC'],
            'size-asc' => ['field' => 'i.size', 'direction' => 'ASC'],
            'size-desc' => ['field' => 'i.size', 'direction' => 'DESC'],
        ];

        if (isset($sortMapping[$sortBy])) {
            $sort = $sortMapping[$sortBy];
            $queryBuilder->orderBy($sort['field'], $sort['direction']);
        } else {
            $queryBuilder->orderBy('i.uploadedAt', 'DESC');
        }
    }

    /**
     * Liczy całkowitą liczbę wyników
     * @param QueryBuilder $queryBuilder - QueryBuilder do liczenia wyników
     * @return int - Liczba wyników
     */
    public function countTotalResults(QueryBuilder $queryBuilder): int
    {
        $countQueryBuilder = clone $queryBuilder;

        return (int) $countQueryBuilder->select('COUNT(i.id)')->getQuery()->getSingleScalarResult();
    }

    /**
     * Waliduje i sanityzuje parametr page
     * @param mixed $page - Wartość parametru page
     * @return int - Zwalidowana wartość parametru page
     */
    public function validatePage(mixed $page): int
    {
        $pageInt = filter_var($page, FILTER_VALIDATE_INT);

        return $pageInt !== false && $pageInt > 0 ? $pageInt : 1;
    }

    /**
     * Waliduje i sanityzuje parametr perPage
     * @param mixed $perPage - Wartość parametru perPage
     * @return int - Zwalidowana wartość parametru perPage
     */
    public function validatePerPage(mixed $perPage): int
    {
        $perPageInt = filter_var($perPage, FILTER_VALIDATE_INT);

        return $perPageInt !== false ? max(1, min(50, $perPageInt)) : 12;
    }

    /**
     * Sanityzuje frazę wyszukiwania
     * @param mixed $search - Fraza wyszukiwania
     * @return string - Oczyszczona fraza wyszukiwania
     */
    public function sanitizeSearchTerm(mixed $search): string
    {
        if (!is_string($search)) {
            return '';
        }

        $search = trim($search);

        if (strlen($search) > self::MAX_SEARCH_LENGTH) {
            $search = substr($search, 0, self::MAX_SEARCH_LENGTH);
        }

        // Usunięcie znaków, które mogą być użyte do SQL injection w LIKE
        $search = str_replace(['%', '_'], ['\\%', '\\_'], $search);

        $unicodeString = new UnicodeString($search);

        return $unicodeString->ascii()->toString(); // usunięcie znaków specjalnych
    }

    /**
     * Waliduje parametr dateFilter
     * @param mixed $dateFilter - Wartość parametru dateFilter
     * @return string - Zwalidowana wartość parametru dateFilter
     */
    public function validateDateFilter(mixed $dateFilter): string
    {
        if (!is_string($dateFilter) || !in_array($dateFilter, self::ALLOWED_DATE_FILTERS, true)) {
            return 'all';
        }

        return $dateFilter;
    }

    /**
     * Waliduje parametr sortBy
     * @param mixed $sortBy - Wartość parametru sortBy
     * @return string - Zwalidowana wartość parametru sortBy
     */
    public function validateSortOption(mixed $sortBy): string
    {
        if (!is_string($sortBy) || !in_array($sortBy, self::ALLOWED_SORT_OPTIONS, true)) {
            return 'date-desc';
        }

        return $sortBy;
    }
}