import ThemeSwitcher from "../../modules/ThemeSwitcher.js"
import SearchForm from "../../modules/SearchForm.js"
import ImagesGalleryModal from "../../modules/ImagesGallery.js"
import CircularProgressBar from "../../modules/CircularProgressBar.js"


/*
// Czekaj, aż DOM zostanie załadowany
document.addEventListener('DOMContentLoaded', function () {
  // Nawigacja - obsługa aktywnych linków
  const pageLinks = document.querySelectorAll('a#pageLink');
  pageLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      // Usuń klasę active ze wszystkich linków
      pageLinks.forEach(l => l.classList.remove('active'));
      // Dodaj klasę active do klikniętego linku
      this.classList.add('active');
    });
  });

  // Obsługa przycisków pokazujących/ukrywających panele boczne
  const btnShowLeftArea = document.querySelector('.btn-show-left-area');
  const btnShowRightArea = document.querySelector('.btn-show-right-area');
  const btnCloseLeft = document.querySelector('.btn-close-left');
  const btnCloseRight = document.querySelector('.btn-close-right');
  const leftArea = document.querySelector('.left-area');
  const rightArea = document.querySelector('.right-area');

  // Przycisk pokazujący lewy panel
  btnShowLeftArea.addEventListener('click', function () {
    leftArea.classList.add('show');
  });

  // Przycisk pokazujący prawy panel
  btnShowRightArea.addEventListener('click', function () {
    rightArea.classList.add('show');
  });

  // Przycisk zamykający prawy panel
  btnCloseRight.addEventListener('click', function () {
    rightArea.classList.remove('show');
  });

  // Przycisk zamykający lewy panel
  btnCloseLeft.addEventListener('click', function () {
    leftArea.classList.remove('show');
  });

  // Obsługa przycisku "ulubione" dla zdjęć
  const favButtons = document.querySelectorAll('.btn-favorite');
  favButtons.forEach(button => {
    button.addEventListener('click', function () {
      this.classList.toggle('active');
    });
  });

  // Obsługa "przyklejania" nagłówka wyszukiwania podczas przewijania
  const mainArea = document.querySelector('.main-area');
  const mainAreaHeader = document.querySelector('.main-area-header');

  mainArea.addEventListener('scroll', function () {
    if (mainArea.scrollTop >= 88) {
      mainAreaHeader.classList.add('fixed');
    } else {
      mainAreaHeader.classList.remove('fixed');
    }
  });

  // Obsługa wyszukiwania
  const searchInput = document.querySelector('.search-input');
  searchInput.addEventListener('input', function () {
    const searchValue = this.value.toLowerCase();

    // Filtrowanie ostatnich plików
    const fileRows = document.querySelectorAll('.files-table-row');
    fileRows.forEach(row => {
      const fileName = row.querySelector('.name-cell').textContent.toLowerCase();
      if (fileName.includes(searchValue)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });

    // Można dodać filtrowanie innych elementów, np. albumów
    const albumCards = document.querySelectorAll('.album-card');
    albumCards.forEach(card => {
      if (card.querySelector('.album-title')) {
        const albumTitle = card.querySelector('.album-title').textContent.toLowerCase();
        if (albumTitle.includes(searchValue)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      }
    });
  });

  // Obsługa tworzenia nowego albumu
  const createAlbumCard = document.querySelector('.album-card:last-child');
  if (createAlbumCard) {
    createAlbumCard.addEventListener('click', function () {
      // Tutaj możesz dodać logikę tworzenia nowego albumu
      // Przykład: wyświetlenie modalu z formularzem
      alert('Funkcja tworzenia nowego albumu zostanie zaimplementowana w przyszłości.');
    });
  }

  // Obsługa kliknięcia w przycisk "więcej" w tabeli plików
  const moreActionButtons = document.querySelectorAll('.more-action');
  moreActionButtons.forEach(button => {
    button.addEventListener('click', function (e) {
      e.stopPropagation();
      // Tutaj można dodać logikę wyświetlania menu kontekstowego
      // Przykład: pozycjonowanie menu kontekstowego przy przycisku

      // Przykładowa implementacja:
      const rect = this.getBoundingClientRect();
      console.log('Menu kontekstowe powinno pojawić się przy: ', rect.left, rect.bottom);

      // W przyszłości można dodać rzeczywiste menu kontekstowe
    });
  });

  // Obsługa kliknięcia w zdjęcie - podgląd pełnoekranowy
  const imageWrappers = document.querySelectorAll('.image-wrapper');
  imageWrappers.forEach(wrapper => {
    wrapper.addEventListener('click', function () {
      const imgSrc = this.querySelector('img').src;

      // Tutaj można dodać logikę wyświetlania zdjęcia w pełnym ekranie
      // Przykład: tworzenie elementu podglądu pełnoekranowego

      console.log('Podgląd zdjęcia: ', imgSrc);

      // W przyszłości można dodać rzeczywisty podgląd pełnoekranowy
    });
  });

  // Inicjalizacja interfejsu - symulacja ładowania danych
  function initializeInterface() {
    console.log('Panel zarządzania zdjęciami został załadowany.');
  }

  // Wywołaj inicjalizację
  initializeInterface();
});


*/