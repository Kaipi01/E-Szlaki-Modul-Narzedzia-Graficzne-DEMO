<?php 

namespace App\Repository;

use App\Entity\GTMCompressionJob;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class GTMCompressionJobRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GTMCompressionJob::class);
    }

    public function save(GTMCompressionJob $job, bool $flush = true): void
    {
        $this->getEntityManager()->persist($job);
        
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
