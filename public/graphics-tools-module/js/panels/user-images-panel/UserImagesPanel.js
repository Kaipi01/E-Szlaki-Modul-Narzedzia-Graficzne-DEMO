import Toast from "../../modules/Toast.js";
import CustomSelect from "../../modules/CustomSelect.js";
import { formatFileSize } from "../../utils/file-helpers.js";
import { emitEvent} from "../../utils/events.js";
import ImagesGalleryModal from "../../modules/ImagesGallery.js";

/**
 * Klasa UserImagesPanel - zarządza panelem zdjęć użytkownika z mechanizmem infinity scroll,
 * wyszukiwaniem, filtrowaniem i sortowaniem.
 */
export default class UserImagesPanel {
  /**
   * Konstruktor klasy UserImagesPanel
   * @param {Object} options - Opcje konfiguracyjne
   * @param {string} options.containerSelector - Selektor kontenera panelu
   * @param {string} options.apiUrl - URL API do pobierania zdjęć
   * @param {number} options.perPage - Liczba zdjęć na stronę
   * @param {number} options.scrollThreshold - Próg przewijania dla ładowania kolejnych zdjęć (w pikselach)
   */
  constructor(options = {}) {
    this.options = options;

    this.state = {
      images: [],
      page: 1,
      loading: false,
      hasMore: true,
      searchTerm: '',
      filters: {
        date: 'all'
      },
      sortBy: 'date-desc'
    };

    this.imagesNumber = 0

    this.initElements();
    this.initEventListeners();
    this.loadImages();
  }

  /** Inicjalizacja referencji do elementów DOM */
  initElements() {
    this.container = document.querySelector(this.options.containerSelector);
    if (!this.container) {
      console.error(`Nie znaleziono elementu o selektorze ${this.options.containerSelector}`);
      return;
    }

    this.imagesContainer = this.container.querySelector('#images-container');
    this.searchInput = this.container.querySelector('#image-search');
    this.searchButton = this.container.querySelector('#search-button');
    this.filterDate = new CustomSelect(this.container.querySelector('#filter-date'));
    this.sortSelect = new CustomSelect(this.container.querySelector('#sort-by'));
    this.filterResetButton = this.container.querySelector('#filter-reset');
    this.clearFiltersButton = this.container.querySelector('#clear-filters');
    this.resultsCount = this.container.querySelector('#results-count');
    this.loadingIndicator = this.container.querySelector('#loading-indicator');
    this.noResults = this.container.querySelector('#no-results');
  }

  /** Inicjalizacja nasłuchiwania zdarzeń */
  initEventListeners() {
    window.addEventListener('scroll', this.handleScroll.bind(this));

    this.searchInput.addEventListener('input', this.debounce(this.handleSearchInput.bind(this), 300));

    this.searchButton.addEventListener('click', this.handleSearchButton.bind(this));

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSearchButton(e);
      }
    });

    // this.filterDate.addEventListener('change', this.handleFilterChange.bind(this));

    this.filterDate.onChangeSelect((e) => this.handleFilterChange(e))

    // this.sortSelect.addEventListener('change', this.handleSortChange.bind(this));
    this.sortSelect.onChangeSelect((e) => this.handleSortChange(e))

    this.filterResetButton.addEventListener('click', this.resetFilters.bind(this));

    this.clearFiltersButton.addEventListener('click', this.resetFilters.bind(this));
  }

  /** Obsługa zdarzenia przewijania strony */
  handleScroll() {
    if (this.state.loading || !this.state.hasMore) return;

    const scrollY = window.scrollY || window.pageYOffset;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (documentHeight - scrollY - windowHeight < this.options.scrollThreshold) {
      this.loadMoreImages();
    }
  }

  /**
   * Obsługa wprowadzania tekstu w polu wyszukiwania
   * @param {Event} e - Obiekt zdarzenia
   */
  handleSearchInput(e) {
    this.state.searchTerm = e.target.value.trim();
  }

  /**
   * Obsługa kliknięcia przycisku wyszukiwania
   * @param {Event} e - Obiekt zdarzenia
   */
  handleSearchButton(e) {
    e.preventDefault();
    this.resetImagesState();
    this.loadImages();
  }

  /**
   * Obsługa zmiany filtra daty
   * @param {Event} e - Obiekt zdarzenia
   */
  handleFilterChange(e) {
    this.state.filters.date = e.detail.value;
    this.resetImagesState();
    this.loadImages();
  }

  /**
   * Obsługa zmiany sortowania
   * @param {Event} e - Obiekt zdarzenia
   */
  handleSortChange(e) {
    this.state.sortBy = e.detail.value;
    this.resetImagesState();
    this.loadImages();
  }

  /** Resetowanie filtrów i ponowne ładowanie zdjęć */
  resetFilters() {
    this.state.searchTerm = '';
    this.state.filters.date = 'all';
    this.state.sortBy = 'date-desc';

    this.searchInput.value = '';
    this.filterDate.chooseOption(null)
    this.sortSelect.chooseOption('date-desc');

    this.resetImagesState();
    this.loadImages();
  }

  /** Resetowanie stanu zdjęć przed ponownym ładowaniem */
  resetImagesState() {
    this.state.images = [];
    this.state.page = 1;
    this.state.hasMore = true;
    this.imagesContainer.innerHTML = '';
    this.toggleNoResults(false);
  }

  /** Ładowanie zdjęć z API */
  async loadImages() {
    if (this.state.loading || !this.state.hasMore) return;

    this.setLoading(true);

    try {
      const params = new URLSearchParams({
        page: this.state.page,
        perPage: this.options.perPage,
        search: this.state.searchTerm,
        date: this.state.filters.date,
        sortBy: this.state.sortBy
      });

      const response = await fetch(`${this.options.apiUrl}?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      this.state.hasMore = data.hasMore;
      this.state.images = [...this.state.images, ...data.images];

      this.renderImages(data.images);
      this.updateResultsCount(data.total);

      if (this.state.images.length === 0) {
        this.toggleNoResults(true);
      } else {
        this.toggleNoResults(false);
      }

    } catch (error) {
      console.error('Błąd podczas ładowania zdjęć:', error);
      this.showError('Wystąpił błąd podczas ładowania zdjęć. Spróbuj ponownie później.');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Ładowanie kolejnej strony zdjęć
   */
  loadMoreImages() {
    this.state.page++;
    this.loadImages();
  }

  /**
   * Renderowanie zdjęć w kontenerze
   * @param {Array} images - Tablica obiektów zdjęć do wyrenderowania
   */
  renderImages(images) {
    if (!images || images.length === 0) return;

    const fragment = document.createDocumentFragment();

    images.forEach((image) => {
      const imageElement = this.createImageElement(image);
      fragment.appendChild(imageElement);
    });

    this.imagesContainer.appendChild(fragment);

    emitEvent(ImagesGalleryModal.IMAGES_PREVIEWS_RERENDERED_EVENT)
  }

  /**
   * Tworzenie elementu DOM dla pojedynczego zdjęcia
   * @param {Object} image - Obiekt zdjęcia
   * @returns {HTMLElement} Element DOM reprezentujący zdjęcie
   */
  createImageElement(image) {
    const wrapper = document.createElement('a');
    // wrapper.href = image.url || '#';
    wrapper.href = '#';
    wrapper.className = 'image-wrapper';
    wrapper.setAttribute('aria-current', 'page');
    // wrapper.setAttribute('data-gallery-preview', this.imagesNumber++);
    wrapper.setAttribute('data-gallery-preview', '');
    wrapper.setAttribute('data-src', image.src);

    // Overlay z informacjami
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';

    const photoInfo = document.createElement('div');
    photoInfo.className = 'photo-info';

    const photoInfoText = document.createElement('div');
    photoInfoText.className = 'photo-info-text';

    const photoName = document.createElement('p');
    photoName.className = 'photo-name medium';
    photoName.textContent = image.name;

    const photoSubtext = document.createElement('p');
    photoSubtext.className = 'photo-subtext medium';
    photoSubtext.textContent = formatFileSize(image.size);

    photoInfoText.appendChild(photoName);
    photoInfoText.appendChild(photoSubtext);
    photoInfo.appendChild(photoInfoText);
    overlay.appendChild(photoInfo);

    // Obraz
    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.name;

    // Data
    const photoDate = document.createElement('span');
    photoDate.className = 'photo-date';
    photoDate.textContent = this.formatDate(image.date);

    // Składanie elementów
    wrapper.appendChild(overlay);
    wrapper.appendChild(img);
    wrapper.appendChild(photoDate);

    return wrapper;
  }

  /**
   * Aktualizacja licznika wyników
   * @param {number} count - Całkowita liczba wyników
   */
  updateResultsCount(count) {
    if (this.resultsCount) {
      this.resultsCount.textContent = count;
    }
  }

  /**
   * Przełączanie widoczności komunikatu o braku wyników
   * @param {boolean} show - Czy pokazać komunikat
   */
  toggleNoResults(show) {
    if (this.noResults) {
      this.noResults.style.display = show ? 'flex' : 'none';
    }

    if (this.imagesContainer) {
      this.imagesContainer.style.display = show ? 'none' : 'grid';
    }
  }

  /**
   * Ustawienie stanu ładowania
   * @param {boolean} isLoading - Czy trwa ładowanie
   */
  setLoading(isLoading) {
    this.state.loading = isLoading;

    if (this.loadingIndicator) {
      this.loadingIndicator.classList.toggle('visible', isLoading);
    }
  }

  /**
   * Wyświetlanie komunikatu o błędzie
   * @param {string} message - Treść komunikatu
   */
  showError(message) {
    console.error(message);
    Toast.show(Toast.ERROR, message)
  }

  /**
   * Formatowanie daty do czytelnej postaci
   * @param {string} dateString - Data w formacie ISO lub timestamp
   * @returns {string} Sformatowana data
   */
  formatDate(dateString) {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString; // Zwracamy oryginalny string, jeśli parsowanie się nie powiedzie
    }

    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Funkcja debounce do ograniczenia częstotliwości wykonywania funkcji
   * @param {Function} func - Funkcja do wykonania
   * @param {number} wait - Czas oczekiwania w ms
   * @returns {Function} Funkcja z debounce
   */
  debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Symulacja odpowiedzi API dla celów testowych
   * @returns {Promise<Object>} Symulowana odpowiedź API
   */
  async mockApiResponse() {
    // Ta metoda może być używana do testowania bez rzeczywistego API
    return new Promise(resolve => {
      setTimeout(() => {
        const images = Array.from({ length: 10 }, (_, i) => ({
          id: this.state.page * 100 + i,
          name: `sample-image-${this.state.page}-${i}.jpg`,
          src: `https://picsum.photos/id/${this.state.page * 10 + i}/500/300`,
          url: `#image-${this.state.page}-\${i}`,
          size: Math.floor(Math.random() * 10000000),
          date: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString()
        }));

        resolve({
          images,
          total: 100,
          hasMore: this.state.page < 5
        });
      }, 800);
    });
  }
}