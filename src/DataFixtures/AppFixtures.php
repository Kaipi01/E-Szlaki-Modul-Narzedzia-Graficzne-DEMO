<?php

namespace App\DataFixtures;

use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\Security\Core\Encoder\UserPasswordEncoderInterface;

class AppFixtures extends Fixture
{
    public function __construct(private UserPasswordEncoderInterface $passwordEncoder)
    {
        $this->passwordEncoder = $passwordEncoder;
    }

    public function load(ObjectManager $manager)
    { 
        $manager->persist($this->createTestUser('user@example.com'));
        $manager->persist($this->createTestUser('test@example.com'));
        $manager->flush();
    }

    private function createTestUser(string $email): User
    {
        $user = new User();
        $user->setEmail($email);
        $user->setRoles(['ROLE_USER']);

        $encodedPassword = $this->passwordEncoder->encodePassword(
            $user,
            '12345'
        );
        $user->setPassword($encodedPassword);

        return $user;
    }
}
