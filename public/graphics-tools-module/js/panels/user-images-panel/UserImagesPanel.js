import Toast from "../../modules/Toast.js";
import CustomSelect from "../../modules/CustomSelect.js";
import { formatFileSize } from "../../utils/file-helpers.js";
import { emitEvent } from "../../utils/events.js";
import ImagesGalleryModal from "../../modules/ImagesGallery.js";
import SearchForm from "../../modules/SearchForm.js";
import Modal from "../../modules/Modal.js";
import { GRAPHICS_TOOLS_MODULE } from "../../utils/constants.js"
import AbstractPanel from "../../modules/AbstractPanel.js";
import { debounce } from "../../utils/time-utils.js";
import printImage from "../../utils/printImage.js";

/**
 * Klasa UserImagesPanel - zarządza panelem zdjęć użytkownika z mechanizmem infinity scroll,
 * wyszukiwaniem, filtrowaniem i sortowaniem.
 */
export default class UserImagesPanel extends AbstractPanel {

  CONFIRM_MODAL_ID = GRAPHICS_TOOLS_MODULE.CONFIRM_MODAL_ID

  /**
   * Konstruktor klasy UserImagesPanel
   * @param {HTMLElement} container
   * @param {Object} options - Opcje konfiguracyjne
   * @param {string} options.containerSelector - Selektor kontenera panelu
   * @param {string} options.getUserImagesUrl - URL API do pobierania zdjęć
   * @param {string} options.removeUserImageUrl - URL API do usunięcia zdjęcia
   * @param {string} options.removeAllUserImagesUrl - URL API do usunięcia wszystkich zdjęć
   * @param {number} options.perPage - Liczba zdjęć na stronę
   * @param {number} options.scrollThreshold - Próg przewijania dla ładowania kolejnych zdjęć (w pikselach)
   */
  constructor(container, options = {}) {
    super(container)

    this.options = options;

    this.state = {
      images: [],
      page: 1,
      loading: false,
      hasMore: true,
      searchTerm: '',
      searchTermFromURL: new URL(window.location).searchParams.get('szukaj') ?? '',
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

    if (!this.container) {
      this.showError(`Nie znaleziono elementu o selektorze ${this.options.containerSelector}`)
      return;
    }

    this.imagesContainer = this.container.querySelector('#images-container');
    this.searchInput = this.container.querySelector('#gtm-search-input-for-images');
    this.filterDate = new CustomSelect(this.container.querySelector('#filter-date'));
    this.sortSelect = new CustomSelect(this.container.querySelector('#sort-by'));
    this.filterResetButton = this.container.querySelector('#filter-reset');
    this.clearFiltersButton = this.container.querySelector('#clear-filters');
    this.removeAllImagesButton = this.container.querySelector('#remove-all-images-btn');
    this.resultsCount = this.container.querySelector('#results-count');
    this.loadingIndicator = this.container.querySelector('#loading-indicator');
    this.noResults = this.container.querySelector('#no-results');
    this.containerAlerts = this.getByAttribute("data-operation-alerts")

  }

  /** @param {Event} e  */
  handleRemoveAllImages(e) {
    e.preventDefault()

    Modal.show(this.CONFIRM_MODAL_ID);

    const modal = Modal.get(this.CONFIRM_MODAL_ID);
    const modalMessage = modal.querySelector('[data-message]');
    const confirmBtn = modal.querySelector('[data-confirm-btn]');
    const denyBtn = modal.querySelector('[data-deny-btn]');

    modalMessage.textContent = "Czy na pewno usunąć wszystkie swoje grafiki? Tej operacji nie da się cofnąć"

    confirmBtn.onclick = async (e) => {
      await this.removeAllImages(e);

      Modal.hide(this.CONFIRM_MODAL_ID)

    }

    denyBtn.onclick = (e) => Modal.hide(this.CONFIRM_MODAL_ID) 
  }

  /** Inicjalizacja nasłuchiwania zdarzeń */
  initEventListeners() {
    window.addEventListener('scroll', this.handleScroll.bind(this));

    this.searchInput.addEventListener('input', debounce(this.handleSearchInput.bind(this), 300));

    this.removeAllImagesButton.addEventListener('click', (e) => this.handleRemoveAllImages(e))

    document.addEventListener(SearchForm.SEARCH_EVENT, (e) => this.handleSearchButton(e))

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSearchButton(e);
      }
    });

    this.filterDate.onChangeSelect((e) => this.handleFilterChange(e))

    this.sortSelect.onChangeSelect((e) => this.handleSortChange(e))

    this.filterResetButton.addEventListener('click', this.resetFilters.bind(this));

    this.clearFiltersButton.addEventListener('click', this.resetFilters.bind(this));

    this.container.addEventListener('click', async (e) => {
      const target = e.target

      if (target.hasAttribute('data-print-link')) {
        e.preventDefault()
        printImage(e.target.dataset.src)
      }

      if (target.hasAttribute('data-remove-link')) {
        this.showRemoveImageConfirmModal(e)
      }
    })
  }

  /** @param {Event} e  */
  async removeAllImages(e) {
    e.target.textContent = "Proszę czekać ..."
    e.target.classList.add('loading-btn-icon')

    const response = await fetch(this.options.removeAllUserImagesUrl, { method: "DELETE" })
    const { success, error, deletedCount } = await response.json()

    if (success) {
      Toast.show(Toast.SUCCESS, `Pomyślnie usunięto wszystkie grafiki w liczbie: ${deletedCount}`)

      this.resultsCount.textContent = "0"
      this.imagesContainer.innerHTML = ''
      this.noResults.style.removeProperty('display')
    } else {
      this.showError(error)
    }

    e.target.textContent = "Tak"
    e.target.classList.remove('loading-btn-icon')
  }

  /** 
   * @param {number|null} imageId  
   * @param {Event} e
   */
  async removeImage(imageId, e) {
    if (! imageId) return

    if (isNaN(imageId)) {
      this.showError("Podano błędną wartość ID !")
      return
    }

    e.target.textContent = "Proszę czekać ..."
    e.target.classList.add('loading-btn-icon')

    const response = await fetch(this.options.removeUserImageUrl + imageId, { method: "DELETE" })
    const { success, error, imageName } = await response.json()

    if (success) {
      Toast.show(Toast.SUCCESS, `Grafika "${imageName}" została pomyślnie usunięta`)

      this.container.querySelector(`[data-image-card="${imageId}"]`)?.remove()
    } else {
      this.showError(error)
    }

    e.target.textContent = "Tak"
    e.target.classList.remove('loading-btn-icon')
  }

  /** @param {Event} e */
  showRemoveImageConfirmModal(e) {
    e.preventDefault()

    Modal.show(this.CONFIRM_MODAL_ID);

    const imageId = e.target.dataset.imageId
    const imageName = e.target.dataset.imageName
    const modal = Modal.get(this.CONFIRM_MODAL_ID);
    const modalMessage = modal.querySelector('[data-message]');
    const confirmBtn = modal.querySelector('[data-confirm-btn]');
    const denyBtn = modal.querySelector('[data-deny-btn]');

    confirmBtn.onclick = async (e) => {
        await this.removeImage(imageId, e);

        Modal.hide(this.CONFIRM_MODAL_ID)
    }

    denyBtn.onclick = () => Modal.hide(this.CONFIRM_MODAL_ID)

      // if (target.hasAttribute('data-confirm-btn')) {
      //   await this.removeImage(e);
      //   Modal.hide(this.CONFIRM_MODAL_ID)
      // }

      // if (target.hasAttribute('data-deny-btn')) {
      //   Modal.hide(this.CONFIRM_MODAL_ID)
      // }

    modalMessage.textContent = `Czy na pewno chcesz usunąć "${imageName}" ?`
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
        search: this.state.searchTerm !== '' ? this.state.searchTerm : this.state.searchTermFromURL,
        date: this.state.filters.date,
        sortBy: this.state.sortBy
      }); 

      const response = await fetch(`${this.options.getUserImagesUrl}?${params}`);

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
    const wrapper = document.createElement('li');

    wrapper.className = 'modern-card image-card'
    wrapper.setAttribute('data-image-card', image.id)

    const link = document.createElement('a');

    link.href = '#';
    link.className = 'image-wrapper';
    link.setAttribute('aria-current', 'page');
    link.setAttribute('data-gallery-preview', '');
    link.setAttribute('data-src', image.thumbnailSrc ?? image.src);
    link.setAttribute('data-download-src', image.src);

    // Overlay z informacjami
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';

    const photoInfo = document.createElement('div');
    photoInfo.className = 'photo-info';

    const photoInfoText = document.createElement('div');
    photoInfoText.className = 'photo-info-text';

    const photoName = document.createElement('p');
    photoName.className = 'photo-name medium';
    photoName.textContent = " " + image.name;

    const photoNameIcon = document.createElement('i')
    photoNameIcon.className ="fa-regular fa-image"  

    photoName.prepend(photoNameIcon)

    const photoSubtext = document.createElement('p');
    photoSubtext.className = 'photo-subtext medium';
    photoSubtext.textContent = formatFileSize(image.size);

    photoInfoText.appendChild(photoName);
    photoInfoText.appendChild(photoSubtext);
    photoInfo.appendChild(photoInfoText);
    overlay.appendChild(photoInfo);

    const img = document.createElement('img');
    img.src = image.thumbnailSrc ?? image.src;
    img.alt = image.name;

    // Data
    const photoDate = document.createElement('span');
    photoDate.className = 'photo-date';
    photoDate.textContent = this.formatDate(image.date);

    // Składanie elementów
    link.appendChild(overlay);
    link.appendChild(img);
    link.appendChild(photoDate);

    const imageInfo = document.createElement('span')

    imageInfo.className = "image-info"

    const downloadLink = document.createElement('a')

    downloadLink.href = image.src
    downloadLink.className = "badge badge-link badge-link-blue"
    downloadLink.setAttribute('download', '')

    downloadLink.innerHTML = `
      <i class="fa-solid fa-circle-down badge-link-icon"></i>
      <span>Pobierz</span>
    `

    const printLink = document.createElement('a')

    printLink.href = '#'
    printLink.className = "badge badge-link"
    printLink.setAttribute('data-print-link', '')
    printLink.setAttribute('data-src', image.src)

    printLink.innerHTML = `
      <i class="fa-solid fa-print badge-link-icon"></i>
      <span>Drukuj</span>
    `
    const removeLink = document.createElement('a')

    removeLink.href = '#'
    removeLink.className = "badge badge-link badge-link-red"
    removeLink.setAttribute('data-remove-link', '')
    removeLink.setAttribute('data-image-id', image.id)
    removeLink.setAttribute('data-image-name', image.name)

    removeLink.innerHTML = `
      <i class="fa-solid fa-trash badge-link-icon"></i>
      <span>Usuń</span>
    `  

    imageInfo.appendChild(downloadLink)
    imageInfo.appendChild(printLink)
    imageInfo.appendChild(removeLink)

    wrapper.appendChild(link)
    wrapper.appendChild(imageInfo)

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

  /** @param {string} message - Treść komunikatu */
  showError(message) {
    this.containerAlerts.innerHTML = ''
    super.showError(message, this.containerAlerts);
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
}