# Moduł Narzędzia Graficzne

Moduł odpowiada za obsługę grafik w aplikacji. Umożliwia:

* Optymalizację / kompresję grafik
* Konwersję obrazów między formatami
* Proste operacje i manipulacje na grafikach, np.:

  * Przycięcia
  * Dodawanie cieni
  * Sepię
  * Blur
  * Inne filtry
  * Zmiana saturacji kolorów

## Wymagania

* PHP: 8.1.31
* Edytowane pliki konfiguracyjne:

  * services.yaml
  * monolog.yaml
  * security.yaml

### Ustawienia w php.ini

```ini
max_execution_time = 300
max_input_time = 300
upload_max_filesize = 100M
post_max_size = 100M
max_file_uploads = 80
```

## Instalacja

### Załaduj przykładowe dane

```bash
php bin/console doctrine:fixtures:load
```

### Zainstaluj biblioteki PHP

```bash
composer require intervention/image
composer require spatie/image-optimizer
```

### Instalacja narzędzi systemowych

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get install jpegoptim
sudo apt-get install jpegtran
sudo apt-get install optipng
sudo apt-get install pngquant
sudo apt-get install webp
```

#### Windows (Chocolatey)

1. Zainstaluj Chocolatey:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

2. Zainstaluj narzędzia:

```powershell
choco install jpegoptim
choco install jpegtran
choco install optipng
choco install pngquant
choco install webp
```

3. Sprawdź instalację:

```bash
jpegoptim --version
jpegtran --version
optipng --version
pngquant --version
cwebp -version
```

## Obsługa Imagick

### Windows (PHP 8.1)

1. Zainstaluj ImageMagick 7.1.1.47:

   * przez Chocolatey: `choco install imagemagick`
   * lub pobierz [instalator](https://imagemagick.org/script/download.php#windows) i zaznacz "Install development headers and libraries for C and C++".

2. Pobierz Imagick 3.7.0 dla PHP 8.1 z [PECL](http://pecl.php.net/package/imagick/3.7.0/windows).

   * Sprawdź Thread Safety w `phpinfo();`:

     * disabled → pobierz NTS
     * enabled → pobierz TS

3. Skopiuj `php_imagick.dll` do katalogu `ext/`.

4. W php.ini dodaj:

```ini
extension=imagick
```

5. Zrestartuj serwer i sprawdź `phpinfo();`.

### Linux (Ubuntu/Debian)

```bash
sudo apt install php-pear php-dev libmagickwand-dev -y
sudo pecl install imagick
```

Dodaj do php.ini:

```ini
extension=imagick.so
```

Zrestartuj serwer:

```bash
sudo systemctl restart apache2
```

Sprawdź instalację:

```bash
php -m | grep imagick
```

## Komendy pomocnicze

Wyczyść wszystkie grafiki z katalogu `uploads`:

```bash
php bin/console gtm:clear-graphics
```
