<?php

namespace App\Repository;

use App\Entity\GTMImage;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class GTMImageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GTMImage::class);
    }

    /**
     * @param array $hashes
     * @return GTMImage[]
     */
    public function findByOperationHashes(array $hashes): array
    {
        if (empty($hashes)) {
            return [];
        }

        return $this->createQueryBuilder('i')
            ->where('i.operationHash IN (:hashes)')
            ->setParameter('hashes', $hashes)
            ->getQuery()
            ->getResult();
    }
}
