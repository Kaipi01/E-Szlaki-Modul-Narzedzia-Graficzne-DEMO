"use strict";

import AbstractPanel from "../modules/AbstractPanel.js";
import Toast from "../modules/Toast.js";
import { downloadAjaxFile, formatFileSize } from "../utils/file-helpers.js";
import FileManager from "./FileManager.js";
import UICompressorManager from "./UICompressorManager.js";
import UploadService from "./UploadService.js";

/**
 * Klasa CompressorPanel służąca do kompresji obrazów
 *
 * Odpowiedzialna za:
 * - Koordynację pracy pomiędzy komponentami
 * - Inicjalizację modułów
 * - Zarządzanie przepływem danych
 */
export default class CompressorPanel extends AbstractPanel {
  /**
   * @param {HTMLElement | string} container
   * @param {Object} options - Opcje konfiguracyjne
   * @param {string} options.uploadUrl - URL endpointu do kompresji obrazu
   * @param {string} options.imageDataUrl - URL endpointu do danych skompresowanego obrazu
   * @param {string} options.downloadAllImagesUrl - URL endpointu do pobrania wszystkich skompresowanych obrazów
   * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
   * @param {Array}  options.allowedTypes - Dozwolone typy plików
   * @param {number} options.maxConcurrentUploads - Maksymalna liczba równoczesnych wysyłek
   * @param {number} options.maxBatchSize - Maksymalna liczba plików w jednej partii
   * @param {number} options.maxBatchSizeBytes - Maksymalny rozmiar partii w bajtach
   *
   * @typedef {Object} ImageState
   * @property {string|null} hash - Unikalny identyfikator obrazu.
   * @property {string} name - Nazwa pliku obrazu.
   * @property {number} compressedSize - rozmiar po kompresji 
   * @property {boolean} isOperationComplete - Czy operacja (np. kompresja) została zakończona.
   *
   * @typedef {Object} State
   * @property {ImageState[]} images - Lista obiektów reprezentujących obrazy.
   * @property {boolean} uploading - Czy trwa przesyłanie.
   * @property {boolean} allOperationsCompleted - Czy wszystkie operacje są zakończone?.
   */
  constructor(container, options = {}) {
    super(container);

    this.options = options;

    /** @type {State} */
    this.state = {
      images: [],
      uploading: false,
      allOperationsCompleted: false,
    };

    this.initElements();
    this.initComponents(options);
  }

  initElements() {
    this.elements = {
      container: this.container,
      dropZone: this.getByAttribute("data-drop-zone"),
      fileInput: this.getByAttribute("data-file-input"),
      selectButton: this.getByAttribute("data-select-button"),
      downloadButton: this.getByAttribute("data-download-all-btn"),
      imageTable: this.getByAttribute("data-image-table"),
      resultMessage: this.getByAttribute("data-compressor-result-message"),
      resultTableElements: this.container.querySelectorAll('[data-result-table]'),
      resultValue: this.getByAttribute("data-compressor-result-value"),
      clearButton: this.getByAttribute("data-clear-button"),
      compressorAlerts: this.getByAttribute("data-compressor-alerts"),
      maxFileSizeInfo: this.getByAttribute("max-file-size-info"),
      tableHeadRow: this.getByAttribute("data-table-head-row"),
    };

    this.elements.resultTableElements.forEach(el => el.setAttribute('hidden', ''))
    this.elements.downloadButton.addEventListener("click", this.handleDownloadAllImages.bind(this));
  }

  /** @param {Object} options - Opcje konfiguracyjne */
  initComponents(options) {
    this.fileManager = new FileManager({
      ...options,
      onFileAdded: this.handleFileAdded.bind(this),
      onFileRemoved: this.handleFileRemoved.bind(this),
      onError: this.showError.bind(this),
    });

    this.uiManager = new UICompressorManager(this.elements, {
      ...options,
      onFileSelect: this.handleFileSelect.bind(this),
      onFileRemove: this.handleFileRemove.bind(this),
      onClear: this.handleClear.bind(this),
    });

    this.uploadService = new UploadService(options);
  }

  handleDownloadAllImages() {
    try {
      const imageHashes = this.state.images.map((image) => image.hash).filter((hash) => hash != null);

      downloadAjaxFile(this.options.downloadAllImagesUrl, { imageHashes }, "skompresowane-grafiki.zip");
    } catch (e) {
      this.showError(e.message);
    }
  }

  /**
   * Obsługa wyboru plików przez użytkownika
   * @param {FileList} fileList - Lista wybranych plików
   */
  handleFileSelect(fileList) {
    const newFiles = this.fileManager.addFiles(fileList);

    if (newFiles.length > 0) {
      this.uiManager.displayCurrentResultMessage("Trwa Kompresja, proszę czekać", "...")
      this.elements.resultTableElements.forEach(el => el.removeAttribute('hidden'))
    }

    newFiles.forEach((file) => {
      const fileDetails = this.fileManager.getFileDetails(file);

      this.uiManager
        .renderImagesInfoTable(file, fileDetails.formattedSize)
        .then(() => this.uploadFile(file))
        .catch((error) => {
          this.showError(`Błąd podczas wczytywania pliku "${file.name}".`);
          this.showError(error.message);
        });
    });

    this.updateUI();
  }

  getProgressElementsForFile(fileName) {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, "_");
    const row = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);

    if (!row) {
      console.error(`Nie znaleziono wiersza dla pliku: ${fileName}`);
      return null;
    }

    const statusCell = row.querySelector("[data-status]");

    if (!statusCell) {
      console.error(`Nie znaleziono komórki statusu dla pliku: ${fileName}`);
      return null;
    }

    const progressContainer = statusCell.querySelector(`[data-progress-container-${safeFileName}]`);
    const progressBar = statusCell.querySelector(`[data-progress-bar-${safeFileName}]`);
    const progressText = statusCell.querySelector(`[data-progress-text-${safeFileName}]`);

    if (!progressContainer || !progressBar || !progressText) {
      console.error(`Nie znaleziono elementów progress bara dla pliku: ${fileName}`);
      return null;
    }

    return {
      container: progressContainer,
      bar: progressBar,
      text: progressText,
    };
  }

  /** @param {File} file */
  uploadFile(file) {
    this.uiManager.showFileProgressBar(file.name);

    const statusCell = this.getStatusCellForFile(file.name);
    const progressNameElement = statusCell.querySelector(".animated-progress-name");

    progressNameElement.textContent = "Wysyłanie...";

    this.uploadService.uploadFile(file, {
      onProgress: (percentValue) => this.onProgresOperationHandler(percentValue, progressNameElement, file.name),
      onError: (message) => this.onErrorOperationHandler(message, file.name),
      onComplete: async (operationHash) => await this.onCompleteOperationHandler(operationHash, progressNameElement, file.name),
    });
  }

  /** 
   * @param {string | number} percentValue
   * @param {HTMLElement} progressNameElement 
   * @param {string} fileName
   */
  onProgresOperationHandler(percentValue, progressNameElement, fileName) {
    const percent = parseInt(percentValue);

    this.uiManager.updateFileProgress(fileName, percent);

    // Aktualizacja tekstu statusu w zależności od postępu
    if (percent < 20) {
      progressNameElement.textContent = "Wysyłanie...";
    } else if (percent < 40) {
      progressNameElement.textContent = "Przygotowywanie...";
    } else if (percent < 80) {
      progressNameElement.textContent = "Kompresja...";
    } else if (percent < 100) {
      progressNameElement.textContent = "Finalizacja...";
    } else {
      progressNameElement.textContent = "Zakończono";
    }
  }

  /**
   * @param {string} errorMessage 
   * @param {string} fileName 
   */
  onErrorOperationHandler(errorMessage, fileName) {
    this.showError(`Błąd dla pliku "${fileName}": ${errorMessage}`);
    this.uiManager.updateFileProgress(fileName, 0);
    this.uiManager.setFileProgressError(fileName, "Błąd kompresji");
  }

  /** 
   * @param {string} operationHash 
   * @param {HTMLElement} progressNameElement 
   * @param {string} fileName 
   */
  async onCompleteOperationHandler(operationHash, progressNameElement, fileName) {
    const getImageURL = `${this.options.imageDataUrl}/${operationHash}`;
    const response = await fetch(getImageURL, { method: "GET" });
    const { compressedImage: image } = await response.json();

    // this.uiManager.updateTableHead();

    this.uiManager.updateTableAfterCompression(
      image.originalName,
      image.compressedSize,
      image.compressionRatio,
      image.downloadURL
    );
    this.uiManager.updateFileProgress(fileName, 100);

    const imageDataIndex = this.state.images.findIndex((i) => i.name === fileName);

    if (imageDataIndex !== -1) {
      const imageData = this.state.images[imageDataIndex];

      imageData.isOperationComplete = true;
      imageData.hash = operationHash;
      imageData.compressedSize = image.compressedSize
    }

    if (!this.state.allOperationsCompleted) {
      this.handleAllImagesCompressed();
    }

    progressNameElement.textContent = "Zakończono";
  }

  /** @param {string} fileName - Nazwa pliku */
  getStatusCellForFile(fileName) {
    const row = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);

    if (row) {
      return row.querySelector("[data-status]");
    }

    return null;
  }

  /** @param {File} file - Dodany plik */
  handleFileAdded(file) {
    /** @type {ImageState} */
    const imageData = {
      hash: null,
      name: file.name,
      isOperationComplete: false,
      compressedSize: 0,
    };

    console.log(`Dodano plik: `, imageData);

    this.state.images.push(imageData);
  }

  /**
   * Obsługa usunięcia pliku przez użytkownika
   * @param {string} fileName - Nazwa pliku do usunięcia
   */
  handleFileRemove(fileName) {
    this.fileManager.removeFile(fileName);
    this.uiManager.removeTableRow(fileName);
    this.updateUI();
  }

  /** @param {File} file - Usunięty plik */
  handleFileRemoved(file) {
    // Ten callback jest wywoływany przez FileManager
    // Możemy tutaj wykonać dodatkowe operacje po usunięciu pliku
    console.log(`Usunięto plik: ${file.name}`);
    // TODO: dokończ
  }

  handleClear() {
    if (this.state.uploading) {
      Toast.show(Toast.WARNING, "Pliki są w trakcie wysyłania – proszę poczekać na zakończenie, zanim wyczyścisz dane.");
      return;
    }

    this.state.images = [];
    this.state.uploading = false;
    this.state.allOperationsCompleted = false;

    this.uiManager.displayCurrentResultMessage("Udało się zaoszczędzić: ", "0 KB")

    this.elements.downloadButton.disabled = true
    this.elements.clearButton.disabled = true

    this.fileManager.clearFiles();
    this.uiManager.clearTable();
    this.updateUI();
  }

  /** Sprawdza czy wszystkie grafiki są skompresowane jeśli tak to wyświetla komunikat */
  handleAllImagesCompressed() {
    const allOperationsCompleted = this.state.images.every((i) => i.isOperationComplete);

    if (allOperationsCompleted) { 
      const imagesTotalSizeAfter = this.state.images.reduce((prevValue, currImg) => prevValue + currImg.compressedSize, 0)
      const imagesTotalSizeBefore = this.fileManager.getFilesTotalSize() 

      this.state.allOperationsCompleted = allOperationsCompleted;
      this.state.uploading = false;
      this.uiManager.displayCurrentResultMessage("Udało się zaoszczędzić: ", formatFileSize(imagesTotalSizeBefore - imagesTotalSizeAfter))
      this.elements.downloadButton.removeAttribute("disabled");
      this.elements.clearButton.removeAttribute("disabled");

      Toast.show(Toast.SUCCESS, "Wszystkie obrazy zostały pomyślnie skompresowane!");
    }
  }

  /** @param {string} message - Treść komunikatu */
  showError(message) {
    super.showError(message, this.elements.compressorAlerts);
  }

  updateUI() {
    const hasFiles = this.fileManager.hasFiles();
    this.uiManager.updateUI(hasFiles, this.state.uploading);
  }
}