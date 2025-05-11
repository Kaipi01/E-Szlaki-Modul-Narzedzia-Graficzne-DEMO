import DropZoneManager from "../components/DropZoneManager.js";
import InputFileManager from "../components/InputFileManager.js";
import AbstractPanel from "../modules/AbstractPanel.js"
import { loadModule } from "../utils/lazyImportModule.js";
import CropperManager from "./CropperManager.js";
import ImageEffectManager from "./ImageEffectManager.js";

export default class EditorPanel extends AbstractPanel {
  /**
   * @param {HTMLElement | string} container
   * @param {Object} options - Opcje konfiguracyjne
   * @param {string} options.exportImageUrl - URL endpointu do zapisania obrazu
   * @param {string} options.getImageDataUrl - URL endpointu do pobrania danych obrazu 
   * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
   * @param {Array}  options.allowedTypes - Dozwolone typy plików
   *
   * @typedef {Object} EditorState
   * @property {File | null} image - Aktualny obraz.
   */
  constructor(container, options = {}) {
    super(container);

    this.options = options

    // biblioteki
    this.libs = [
      { url: "/graphics-tools-module/js/libs/pixi.min.js", prop: "PIXI" },
      { url: "/graphics-tools-module/js/libs/cropper.min.js", prop: "Cropper" }
    ];
    this.PIXI = null;
    this.Cropper = null;

    /** @type {EditorState} */
    this.state = {
      image: null,
    };

    // Edytor
    this.editorContainer = this.getByAttribute('data-editor-container')
    this.containerAlerts = this.getByAttribute('data-operation-alerts')
    this.editorContainer.style.display = "none"

    // Loading
    this.editorLoading = this.getByAttribute('data-editor-loading')
    this.editorLoadingProgress = this.getByAttribute('data-editor-loading-progress')
    this.editorLoadingProgressBar = this.editorLoadingProgress.querySelector('[data-progress-bar]')
    this.editorLoadingProgressText = this.editorLoadingProgress.querySelector('[data-progress-text]')
    this.editorLoadingProgressLabel = this.editorLoadingProgress.querySelector('[data-progress-label]')

    // Drop Zone
    this.dropZoneElement = this.getByAttribute('data-drop-zone')
    this.fileInput = this.getByAttribute('data-file-input')

    // Cropper
    this.cropperWrapper = this.getByAttribute('data-cropper-wrapper')
    this.imagePreviewElement = this.getByAttribute('data-image-preview')
    this.cropperWrapper.style.display = "none"

    // Leniwe zaimportowanie ciężkich bibliotek jak PIXI i Cropper
    this.importLibModules(() => {
      this.editorLoading.style.display = "none";
      // this.editorContainer.style.display = "";

      this.initComponents()
      this.setEventsListeners()
    })
  }

  setEventsListeners() {
    this.fileInput.addEventListener('change', (e) => this.handleSelectFile(e))

    this.container.addEventListener('click', (e) => {
      const target = e.target

      switch (true) {
        case target.hasAttribute('data-add-crop-checkbox'): {
          if (target.checked) {
            this.imagePreviewElement.src = this.ImageEffectManager.getCanvas().toDataURL()
            // 
            this.imagePreviewElement.style.display = ""
            this.CropperManager.createCropper()
            this.ImageEffectManager.hideCanvas()

            this.cropperWrapper.removeChild(this.cropperWrapper.lastChild)
          } else {
            this.imagePreviewElement.style.display = "none"
            this.ImageEffectManager.showCanvas()
            this.CropperManager.destroyCropper()
          }
          break;
        }

        case target.hasAttribute('data-add-blur-checkbox'): {
          target.checked ? this.ImageEffectManager.addBlur({ strength: 5 }) : this.ImageEffectManager.removeBlur();
          break;
        }

        case target.hasAttribute('data-add-sepia-checkbox'): {
          target.checked ? this.ImageEffectManager.applySepia() : this.ImageEffectManager.removeSepia();
          break;
        }

        case target.hasAttribute('data-export-image-btn'): {
          this.exportImage(this.ImageEffectManager.getCanvas())
          break;
        }

        case target.hasAttribute('data-clear-effects-checkbox'):
          this.ImageEffectManager.clearEffects();
          break;
      }
    })
  }

  initComponents() {
    this.InputFileManager = new InputFileManager({
      ...this.options,
      onFileAdded: this.handleFileAdded.bind(this),
      onFileRemoved: this.handleFileRemove.bind(this),
      onError: this.showError.bind(this),
    });

    this.DropZone = new DropZoneManager(this.dropZoneElement, (droppedFiles) => this.InputFileManager.addFiles(droppedFiles))

    this.CropperManager = new CropperManager(this.Cropper, this.cropperWrapper, this.imagePreviewElement)

    this.ImageEffectManager = new ImageEffectManager(this.PIXI, this.cropperWrapper, this.imagePreviewElement)
  }

  /** @param {HTMLCanvasElement} canvas */
  async exportImage(canvas) {
    const { name: imageName, type: mimeType } = this.state.image
    const formData = new FormData()
    const getImageBlob = (mimeType) => new Promise(resolve => canvas.toBlob(blob => resolve(blob), mimeType, 1));
    const imageBlob = await getImageBlob(mimeType)

    formData.append('imageBlob', imageBlob, imageName)
    formData.append('toFormat', mimeType) // TODO: Dodaj opcje wybrania docelowego formatu w którym użytkownik będzie chciał wyeksportować

    const response = await fetch(this.options.exportImageUrl, {
      method: 'POST',
      body: formData
    })
    const responseData = await response.json()

    if (response.ok) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(imageBlob);
      link.download = imageName;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      this.showError(responseData.errorMessage)
    }
  }

  async importLibModules(onImportedSuccessfully) {
    const onChunkLoadedProgress = (percent, moduleName) => {
      this.editorLoadingProgressBar.setAttribute('per', percent)
      this.editorLoadingProgressBar.style.width = `${percent}%`;
      this.editorLoadingProgressText.textContent = `${percent}%`;
      this.editorLoadingProgressLabel.textContent = `Pobieranie modułu: ${moduleName}`;
    }

    // ładujemy je sekwencyjnie 
    for (let { url, prop } of this.libs) {
      this[prop] = await loadModule(url, prop, onChunkLoadedProgress);
    }
    // Biblioteka PIXI ładuje swój cały moduł z klasami do obiektu window
    this.PIXI = window.PIXI

    // Poczekaj aż animacja paska postępu się skończy
    setTimeout(onImportedSuccessfully, 1000)
  }

  handleSelectFile(e) {
    const file = e.target.files[0]

    const isFileValid = this.InputFileManager.validateFile(file)

    if (isFileValid) {
      this.InputFileManager.addFiles(file)
      this.handleFileAdded(file)
    }
  }

  /** @param {File} file - Dodany plik */
  handleFileAdded(file) {
    this.state.image = file

    try {
      this.renderImage(file)
      this.imagePreviewElement.addEventListener('load', () => this.ImageEffectManager.init())
      this.dropZoneElement.style.display = "none"
      this.cropperWrapper.style.display = ""
      this.editorContainer.style.display = "";
    } catch (error) {
      this.showError(error)
    }
  }

  /**
   * Obsługa usunięcia pliku przez użytkownika
   * @param {string} fileName - Nazwa pliku do usunięcia
   */
  handleFileRemove(fileName) {
    this.InputFileManager.removeFile(fileName);

    this.state.image = null

    console.log('grafika została usunięta: ' + fileName)
  }

  /**
   * Renderuje obraz na podstawie wrzuconej grafiki do input-a 
   * @param {File} file – obraz wybrany przez użytkownika 
   */
  renderImage(file) {
    const reader = new FileReader();

    reader.onload = (e) => this.imagePreviewElement.src = e.target.result;
    reader.onerror = () => new Error('Błąd odczytu pliku przez FileReader');
    reader.readAsDataURL(file);
  }

  /** @param {string} message - Treść komunikatu */
  showError(message) {
    this.containerAlerts.innerHTML = ''
    super.showError(message, this.containerAlerts);
  }
}