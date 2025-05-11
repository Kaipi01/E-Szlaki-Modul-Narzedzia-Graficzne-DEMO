import AbstractPanel from "../../modules/AbstractPanel.js";
import Alert from "../../modules/Alert.js";
import Toast from "../../modules/Toast.js";
import { emitEvent } from "../../utils/events.js";
import { downloadAjaxFile } from "../../utils/file-helpers.js";

export default class OperationPanel extends AbstractPanel {

  EVENT_ON_CLEAR_TABLE = "gtm:event-on-clear-table";
  EVENT_ON_ALL_IMAGES_COMPLETED = "gtm:event-on-all-images-completed";
  EVENT_ON_FILE_INPUT_SELECT = "gtm:event-on-file-input-select";

  /**
   * @param {HTMLElement | string} container
   * @param {Object} options - Opcje konfiguracyjne
   * @param {string} options.uploadUrl - URL endpointu do przetwarzania obrazu
   * @param {string} options.imageDataUrl - URL endpointu do pobrania danych przetwarzonego obrazu
   * @param {string} options.downloadAllImagesUrl - URL endpointu do pobrania wszystkich przetwarzonych obrazów
   * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
   * @param {Array}  options.allowedTypes - Dozwolone typy plików
   * @param {number} options.maxConcurrentUploads - Maksymalna liczba równoczesnych wysyłek
   * @param {number} options.maxBatchSize - Maksymalna liczba plików w jednej partii
   * @param {number} options.maxBatchSizeBytes - Maksymalny rozmiar partii w bajtach
   *
   * @typedef {Object} ImageState
   * @property {string|null} hash - Unikalny identyfikator obrazu.
   * @property {string} name - Nazwa pliku obrazu.
   * @property {number} savedSize - rozmiar po operacji 
   * @property {boolean} isOperationComplete - Czy operacja została zakończona.
   *
   * @typedef {Object} State
   * @property {ImageState[]} images - Lista obiektów reprezentujących obrazy.
   * @property {File[]} uploadsQueue - Kolejka grafik do przesłania.
   * @property {boolean} uploading - Czy trwa przesyła2nie.
   * @property {boolean} allOperationsCompleted - Czy wszystkie operacje są zakończone?.
   * @property {number | null} checkResultInterval - ID interwała obługującego koniec operacji
   */
  constructor(container, options = {}) {
    super(container);

    this.options = options;

    /** @type {State} */
    this.state = {
      images: [],
      uploading: false,
      uploadsQueue: [],
      allOperationsCompleted: false,
      checkResultInterval: null
    };

    this.initElements();
  }

  /** 
   * @abstract
   * @param {string} operationHash 
   * @param {HTMLElement} progressNameElement 
   * @param {string} fileName 
   */
  async onCompleteOperationHandler(operationHash, progressNameElement, fileName) {}

  initElements() {
    this.elements = {
      container: this.container,
      dropZone: this.getByAttribute("data-drop-zone"),
      fileInput: this.getByAttribute("data-file-input"),
      selectButton: this.getByAttribute("data-select-button"),
      downloadButton: this.getByAttribute("data-download-all-btn"),
      imageTable: this.getByAttribute("data-image-table"),
      resultMessage: this.getByAttribute("data-operation-result-message"),
      resultTableElements: this.container.querySelectorAll('[data-result-table]'),
      resultValue: this.getByAttribute("data-operation-result-value"),
      clearButton: this.getByAttribute("data-clear-button"),
      containerAlerts: this.getByAttribute("data-operation-alerts"),
      maxFileSizeInfo: this.getByAttribute("max-file-size-info"),
      tableHeadRow: this.getByAttribute("data-table-head-row"),
      resultTable: document.querySelector('#graphics-tools-module-result-table')
    };
  }

  /** 
   * @param {string | number} percentValue
   * @param {HTMLElement} progressNameElement 
   * @param {string} fileName
   */
  onProgresOperationHandler(percentValue, progressNameElement, fileName) {
    const percent = parseInt(percentValue);

    this.uiManager.updateFileProgress(fileName, percent);

    if (percent < 20) {
      progressNameElement.textContent = "Wysyłanie...";
    } else if (percent < 40) {
      progressNameElement.textContent = "Przygotowywanie...";
    } else if (percent < 80) {
      progressNameElement.textContent = "Przetwarzanie...";
    } else if (percent < 100) {
      progressNameElement.textContent = "Finalizacja...";
    } else {
      progressNameElement.textContent = "Zakończono";
    }
  }

  /** @param {string} downloadZIPName */
  handleDownloadAllImages(downloadZIPName = "grafiki") {
    try {
      const imageHashes = this.state.images.map((image) => image.hash).filter((hash) => hash != null);

      downloadAjaxFile(this.options.downloadAllImagesUrl, { imageHashes }, `${downloadZIPName}.zip`);
    } catch (e) {
      this.showError(e.message);
    }
  }

  /** 
   * waliduje obecny stan danych wejściowych w panelu 
   * @abstract 
   * @throws {Error}
   */
  validateState() { }

  /**
   * Obsługa wyboru plików przez użytkownika
   * @param {FileList} fileList - Lista wybranych plików
   */
  handleFileSelect(fileList) { 

    // console.log('handleFileSelect(fileList)')

    try {
      this.validateState()
    } catch (error) {
      this.showError(error, "WARNING")

      return
    }

    const newFiles = this.InputFileManager.addFiles(fileList);

    emitEvent(this.EVENT_ON_FILE_INPUT_SELECT, {files: newFiles})

    if (newFiles.length > 0) {
      this.uiManager.displayCurrentResultMessage("Trwa operacja, proszę czekać", "...")
      this.elements.resultTableElements.forEach(el => el.removeAttribute('hidden'))
      this.elements.resultTable.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    } 

    newFiles.reverse().forEach(async (file, index) => {

      const fileDetails = this.InputFileManager.getFileDetails(file);

      await this.uiManager.renderImagesInfoTable(file, fileDetails.formattedSize)
        // .then(() => )
        // .catch((error) => {
        //   this.showError(`Błąd podczas wczytywania pliku "${file.name}".`);
        //   this.showError(error.message);
        // });
      this.uploadFile(file)
        // this.state.uploadsQueue.push(file)
    }); 

    this.updateUI();
    // this.startUploadingFromQueue()
  }

  // startUploadingFromQueue() {
  //   console.log(this.state.uploadsQueue) 

  //   const test1 = this.state.uploadsQueue.shift()
  //   const test2 = this.state.uploadsQueue.shift()

  //   console.log(test1)
  //   console.log(test2)

  //   this.uploadFile(test1)
  //   this.uploadFile(test2)
  // }

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
   * @param {string} errorMessage 
   * @param {string} fileName 
   */
  onErrorOperationHandler(errorMessage, fileName) {
    this.showError(`Błąd dla pliku "${fileName}": ${errorMessage}`);
    this.uiManager.updateFileProgress(fileName, 0);
    this.uiManager.setFileProgressError(fileName, "Błąd operacji");
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
      savedSize: 0,
    };

    this.state.images.push(imageData);
    this.state.uploading = true
  }

  /**
   * Obsługa usunięcia pliku przez użytkownika
   * @param {string} fileName - Nazwa pliku do usunięcia
   */
  handleFileRemove(fileName) {
    this.InputFileManager.removeFile(fileName);
    this.uiManager.removeTableRow(fileName);
    this.updateUI();

    this.state.images = this.state.images.filter(img => img.name != fileName)
  }

  handleClear() {
    if (this.state.uploading) {
      Toast.show(Toast.WARNING, "Pliki są w trakcie wysyłania – proszę poczekać na zakończenie, zanim wyczyścisz dane.");
      return;
    }

    this.state.images = [];
    this.state.uploading = false;
    this.state.allOperationsCompleted = false; 
    
    emitEvent(this.EVENT_ON_CLEAR_TABLE)

    this.elements.downloadButton.disabled = true
    this.elements.clearButton.disabled = true

    this.InputFileManager.clearFiles();
    this.uiManager.clearTable();
    this.updateUI();
  }

  /** 
   * @param {string} message - Treść komunikatu 
   * @param {string | null} type
   */
  showError(message, type = "ERROR") {
    this.elements.containerAlerts.innerHTML = ''

    super.showError(message, this.elements.containerAlerts, type);
  }
    
  updateUI() {
    const hasFiles = this.InputFileManager.hasFiles();

    this.uiManager.updateUI(hasFiles, this.state.uploading);
  }

  /** 
   * Sprawdza czy wszystkie grafiki są przetworzone jeśli tak to wyświetla komunikat 
   * @param {string} message
   */
  handleAllImagesCompleted(message = "") {
    const allOperationsCompleted = this.state.images.every((i) => i.isOperationComplete);

    this.state.checkResultInterval = setInterval(() => {

      if (this.state.uploading) {
        this.handleAllImagesCompleted(message)
      } else {
        clearTimeout(this.state.checkResultInterval)
      }
    }, 1000)

    if (allOperationsCompleted) { 
      this.state.allOperationsCompleted = allOperationsCompleted;
      this.state.uploading = false; 
      this.elements.downloadButton.removeAttribute("disabled");
      this.elements.clearButton.removeAttribute("disabled");

      emitEvent(this.EVENT_ON_ALL_IMAGES_COMPLETED)

      Toast.show(Toast.SUCCESS, message);
      this.elements.containerAlerts.innerHTML = ''
      Alert.show(Alert.SUCCESS, message, this.elements.containerAlerts)
    }
  } 
}