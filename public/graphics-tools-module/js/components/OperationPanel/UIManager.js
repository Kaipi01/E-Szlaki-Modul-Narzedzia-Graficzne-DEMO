'use strict';

import DropZoneManager from "../DropZoneManager.js";

/**
 * Klasa UIManager
 * 
 * Odpowiedzialna za:
 * - Zarządzanie interfejsem użytkownika
 * - Renderowanie miniatur obrazów
 * - Aktualizację wskaźników postępu
 * - Obsługę interakcji użytkownika z interfejsem
 */
export default class UIManager {
  /** 
   * @param {Object} elements - Referencje do elementów DOM
   * @param {HTMLElement} elements.dropZone - Element strefy upuszczania plików
   * @param {HTMLInputElement} elements.fileInput - Input typu file
   * @param {HTMLElement} elements.selectButton - Przycisk wyboru plików
   * @param {HTMLElement} elements.imageTable - Kontener galerii obrazów 
   * @param {HTMLButtonElement} elements.clearButton - Przycisk czyszczenia
   * @param {HTMLElement} elements.progressContainer - Kontener paska postępu
   * @param {HTMLElement} elements.progressBar - Pasek postępu
   * @param {HTMLElement} elements.progressText - Tekst postępu
   * @param {HTMLElement} elements.containerAlerts - Kontener alertów
   * @param {HTMLElement} elements.tableHeadRow 
   * @param {HTMLElement} elements.resultMessage 
   * @param {HTMLElement} elements.resultValue 
   * @param {Object} options - Opcje konfiguracyjne
   * @param {Function} options.onFileSelect - Callback wywoływany po wyborze plików
   * @param {Function} options.onFileRemove - Callback wywoływany po usunięciu pliku 
   * @param {Function} options.onClear - Callback wywoływany po kliknięciu przycisku czyszczenia
   * @param {Function} options.onError - Callback wywoływany w razie błędu
   */
  constructor(elements, options = {}) {
    this.elements = elements;
    this.options = options
    this.onFileSelect = options.onFileSelect || (() => {});
    this.onFileRemove = options.onFileRemove || (() => {});
    this.onClear = options.onClear || (() => {});
    this.onError = options.onError || (() => {});

    this.attachEventListeners();
    this.initUI()
    this.renderTableHead()

    this.DropZone = new DropZoneManager(this.elements.dropZone, droppedFiles => this.onFileSelect(droppedFiles))
  }

  /**
   * @abstract 
   * Renderuje nagłówek tabeli 
   */
  renderTableHead() {}

  /**
   * Renderowanie miniatury obrazu w widoku tabeli
   * @abstract
   * @param {File} file - Plik obrazu do wyświetlenia
   * @param {string} formattedSize - Sformatowany rozmiar pliku
   */
  async renderImagesInfoTable(file, formattedSize) {}

  /**
   * Aktualizacja tabeli po operacji
   * @abstract
   * @param {object} data - dane
   */
  updateTableAfterOperation(data) {}

  /**
   * Aktualizacja paska postępu dla konkretnego pliku
   * @param {string} fileName - Nazwa pliku
   * @param {number} percent - Procent postępu (0-100)
   */
  updateFileProgress(fileName, percent) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const progressBar = document.querySelector(`[data-progress-bar-${safeFileName}]`);
    const progressText = document.querySelector(`[data-progress-text-${safeFileName}]`);
    const progressName = document.querySelector(`[data-progress-container-${safeFileName}] .animated-progress-name`);

    if (progressBar && progressText) {
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${percent}%`;
      progressBar.setAttribute('per', percent);

      if (progressName) {
        if (percent < 20) {
          progressName.textContent = 'Wysyłanie...';
        } else if (percent < 60) {
          progressName.textContent = 'Przygotowywanie...';
        } else if (percent < 100) {
          progressName.textContent = 'Przetwarzanie...';
        } else {
          progressName.textContent = 'Zakończono';
        }
      }
    }
  }

  initUI() {
    if (this.elements.maxFileSizeInfo) {
      this.elements.maxFileSizeInfo.textContent = this.options.maxFileSize / (1024 * 1024) + " MB"
    }
  }

  attachEventListeners() {
    this.elements.fileInput.addEventListener('change', (e) => {
      try {
        this.handleFileSelect(e)
        
      } catch(error) {
        this.onError(error)
      } 
    });
    this.elements.selectButton?.addEventListener('click', () => this.elements.fileInput.click()); 
    this.elements.clearButton.addEventListener('click', () => this.onClear()); 
  }

  /** 
   * @param {string} message 
   * @param {string} value 
   */
  displayCurrentResultMessage(message, value) {
    this.elements.resultMessage.textContent = message
    this.elements.resultValue.textContent = value
  }

  /**
   * Pokazanie paska postępu dla konkretnego pliku
   * @param {string} fileName - Nazwa pliku
   */
  showFileProgressBar(fileName) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const progressContainer = document.querySelector(`[data-progress-container-${safeFileName}]`);
    const progressBar = document.querySelector(`[data-progress-bar-${safeFileName}]`);
    const progressText = document.querySelector(`[data-progress-text-${safeFileName}]`);

    if (progressContainer && progressBar && progressText) {
      progressContainer.style.removeProperty('display'); 
    }
  }

  /**
   * Ustawienie statusu sukcesu dla paska postępu pliku
   * @param {string} fileName - Nazwa pliku
   */
  setFileProgressSuccess(fileName) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const progressContainer = document.querySelector(`[data-progress-container-${safeFileName}]`);

    if (progressContainer) {
      const progressNameElement = progressContainer.querySelector('.animated-progress-name');

      if (progressNameElement) {
        progressNameElement.textContent = 'Zakończono';
        progressNameElement.classList.add('text-success');
      }

      const progressBar = progressContainer.querySelector(`[data-progress-bar-${safeFileName}]`);
      if (progressBar) {
        progressBar.classList.add('progress-success');
      }
    }
  }

  /**
   * Ustawienie statusu błędu dla paska postępu pliku
   * @param {string} fileName - Nazwa pliku
   * @param {string} errorMessage - Komunikat błędu
   */
  setFileProgressError(fileName, errorMessage = 'Błąd') {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const progressContainer = document.querySelector(`[data-progress-container-${safeFileName}]`);

    if (progressContainer) {
      const progressNameElement = progressContainer.querySelector('.animated-progress-name');
      if (progressNameElement) {
        progressNameElement.textContent = errorMessage;
        progressNameElement.classList.add('text-danger');
      }

      const progressBar = progressContainer.querySelector(`[data-progress-bar-${safeFileName}]`);
      if (progressBar) {
        progressBar.classList.add('progress-danger');
      }
    }
  }

  /**
   * Tworzy komórkę tabeli
   * @param {string} content - Zawartość komórki
   * @param {Object} attributes - atrybuty 
   * @returns {HTMLTableCellElement}
   */
  createTableCell(content, attributes = {}) {
    const cell = document.createElement('td');
    cell.innerHTML = content;

    Object.keys(attributes).forEach(key => {
      cell.setAttribute(key, attributes[key])
    });

    return cell;
  }

  /**
   * Usuwa wiersz z tabeli
   * @param {string} fileName - Nazwa pliku do usunięcia
   */
  removeTableRow(fileName) {
    const thumbnailToRemove = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);

    if (thumbnailToRemove) {
      this.elements.imageTable.removeChild(thumbnailToRemove);
    }
  }

  clearTable() {
    this.elements.imageTable.innerHTML = '';
  }

  /**
   * Aktualizacja interfejsu użytkownika
   * @param {boolean} hasFiles - Czy są jakieś pliki
   * @param {boolean} isUploading - Czy trwa wysyłanie
   */
  updateUI(hasFiles, isUploading) {

    if (hasFiles) {
      this.DropZone.addClass('has-files');
    } else {
      this.DropZone.removeClass('has-files');
    }
  }

  handleFileSelect(event) {
    const selectedFiles = event.target.files;

    if (selectedFiles && selectedFiles.length > 0) {
      this.onFileSelect(selectedFiles);
    }

    this.elements.fileInput.value = '';
  } 
}