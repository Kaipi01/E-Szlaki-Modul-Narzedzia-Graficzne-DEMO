<?php

namespace App\Service\GraphicsToolsModule\Workflow\Abstract;

use InvalidArgumentException;
use ReflectionClass;
use ReflectionNamedType;
use ReflectionUnionType;

abstract class AbstractDTO
{
    /**
     * Waliduje tablicę wejściową zgodnie z sygnaturą konstruktora klasy potomnej.
     * Pola typu nullable nie są obowiązkowe i mogą przyjmować wartość null.
     *
     * @param array $data
     * @throws InvalidArgumentException
     */
    protected static function validateArray(array $data): void
    {
        $refClass = new ReflectionClass(static::class);
        $constructor = $refClass->getConstructor();

        if (!$constructor) {
            return;
        }

        foreach ($constructor->getParameters() as $param) {
            $name = $param->getName();
            $type = $param->getType();
            $allowsNull = $type ? $type->allowsNull() : true;

            // Jeśli pole nie istnieje i jest nullable lub ma wartość domyślną, pomijamy
            if (!array_key_exists($name, $data)) {
                if ($allowsNull || $param->isDefaultValueAvailable()) {
                    continue;
                }
                throw new InvalidArgumentException("Brakujące pole: {$name}");
            }

            $value = $data[$name];
 
            if ($value === null && $allowsNull) {
                continue;
            }

            if ($type instanceof ReflectionNamedType) {
                self::assertType($name, $value, $type);

            } elseif ($type instanceof ReflectionUnionType) {
                $valid = false;
                $errors = [];

                foreach ($type->getTypes() as $inner) {
                    if ($inner->getName() === 'null') {
                        // jeśli union zawiera null i wartość jest null, uznajemy za poprawne
                        if ($value === null) {
                            $valid = true;
                            break;
                        }
                        continue;
                    }

                    try {
                        self::assertType($name, $value, $inner);
                        $valid = true;
                        break;
                    } catch (InvalidArgumentException $e) {
                        $errors[] = $e->getMessage();
                    }
                }

                if (!$valid) {
                    throw new InvalidArgumentException(
                        "Pole '{$name}' nie pasuje do żadnego z typów unii: " . implode('; ', $errors)
                    );
                }
            }
        }
    }

    /**
     * Tworzy instancję klasy na podstawie tablicy danych.
     *
     * @param array $data
     * @return static
     * @throws InvalidArgumentException
     */
    public static function fromArray(array $data): static
    {
        static::validateArray($data);

        $refClass = new ReflectionClass(static::class);
        $constructor = $refClass->getConstructor();

        if (!$constructor) {
            return $refClass->newInstance();
        }

        $args = [];
        foreach ($constructor->getParameters() as $param) {
            $name = $param->getName();
            $args[] = $data[$name] ?? $param->getDefaultValue();
        }

        return $refClass->newInstanceArgs($args);
    }

    /**
     * Zwraca zawartość obiektu jako tablicę asocjacyjną.
     *
     * @return array
     */
    public function toArray(): array
    {
        $refClass = new ReflectionClass($this);
        $constructor = $refClass->getConstructor();

        $result = [];
        if ($constructor) {
            foreach ($constructor->getParameters() as $param) {
                $name = $param->getName();
                $result[$name] = $this->$name;
            }
        }

        return $result;
    }

    /**
     * Sprawdza pojedynczy typ nazwy względem wartości.
     *
     * @param string                $name
     * @param mixed                 $value
     * @param ReflectionNamedType   $type
     * @throws InvalidArgumentException
     */
    private static function assertType(string $name, mixed $value, ReflectionNamedType $type): void
    {
        $typeName = $type->getName();

        switch ($typeName) {
            case 'string':
                if (!is_string($value) || trim($value) === '') {
                    throw new InvalidArgumentException("Pole '{$name}' musi być niepustym ciągiem znaków");
                }
                break;

            case 'int':
            case 'float':
                if (!is_numeric($value)) {
                    throw new InvalidArgumentException("Pole '{$name}' musi być wartością numeryczną");
                }
                if ($value < 0) {
                    throw new InvalidArgumentException("Pole '{$name}' musi być liczbą nieujemną");
                }
                break;

            default: 
                break;
        }
    }
}