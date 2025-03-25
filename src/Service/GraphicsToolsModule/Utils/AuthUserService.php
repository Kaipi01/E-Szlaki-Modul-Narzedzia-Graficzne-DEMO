<?php

namespace App\Service\GraphicsToolsModule\Utils;

use App\Entity\User; 
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class AuthUserService 
{
    public function __construct(private TokenStorageInterface $tokenStorage ) {} 

    /** 
     * @throws \Exception
     * @return User
     */
    public function getUserFromToken(): User
    {
        $securityToken = $this->tokenStorage->getToken();

        if (!$securityToken) { 
            throw new \Exception("Brak dostępu!");
        }

        return $securityToken->getUser();
    }
}