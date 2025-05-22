import DropZoneManager from "../../components/DropZoneManager.js";
import InputFileManager from "../../components/InputFileManager.js";
import AbstractPanel from "../../modules/AbstractPanel.js"
import { loadModule } from "../../utils/lazyImportModule.js";
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
      //{ url: "/graphics-tools-module/js/libs/pixi.min.js", prop: "PIXI" },
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

  /** @param {string} src */
  replacePreviewWithNewImage(src) {
    const img = document.createElement('img')

    img.src = src
    img.className = "image-preview"
    img.setAttribute('data-image-preview', '')

    this.imagePreviewElement = img

    this.cropperWrapper.replaceChildren(img)

    return img
  }

  setEventsListeners() {
    this.fileInput.addEventListener('change', (e) => this.handleSelectFile(e))

    this.container.addEventListener('click', async (e) => {
      const target = e.target

      switch (true) {
        case target.hasAttribute('data-crop-image-btn'): {
          // Get the cropped canvas
          const cropperCanvas = await this.CropperManager.getCroppedCanvas()
          
          // Clean up existing PIXI canvas if it exists
          const existingPixiCanvas = this.cropperWrapper.querySelector('[data-pixi-canvas]')
          if (existingPixiCanvas) {
            existingPixiCanvas.remove()
          }
          
          // Replace the image preview with cropped version
          const newImageElement = this.replacePreviewWithNewImage(cropperCanvas.toDataURL())
          
          // Uncheck crop checkbox
          this.container.querySelector('[data-add-crop-checkbox]').checked = false
          
          // Make sure image is visible before initializing effects
          newImageElement.style.display = ""
          
          // Initialize the effects manager with the new image
          this.ImageEffectManager.init(newImageElement)
          
          // After initialization, hide the image and ensure PIXI canvas is visible
          requestAnimationFrame(() => {
            const newPixiCanvas = this.cropperWrapper.querySelector('[data-pixi-canvas]')
            if (newPixiCanvas) {
              newPixiCanvas.style.display = ""
            }
            newImageElement.style.display = "none"
          })
          
          break;
        }

        case target.hasAttribute('data-add-crop-checkbox'): {
          if (target.checked) {
            // When enabling cropper:
            // 1. Update image with current canvas state
            this.imagePreviewElement.src = this.ImageEffectManager.getCanvas().toDataURL()
            // 2. Show the image for cropping
            this.imagePreviewElement.style.display = ""
            // 3. Create the cropper
            this.CropperManager.createCropper()
            // 4. Hide the PIXI canvas
            const pixiCanvas = this.cropperWrapper.querySelector('[data-pixi-canvas]')
            if (pixiCanvas) {
              pixiCanvas.style.display = "none"
            }
          } else {
            // When disabling cropper:
            // 1. Hide the image
            this.imagePreviewElement.style.display = "none"
            // 2. Show the PIXI canvas
            const pixiCanvas = this.cropperWrapper.querySelector('[data-pixi-canvas]')
            if (pixiCanvas) {
              pixiCanvas.style.display = ""
            }
            // 3. Destroy the cropper
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
      this.imagePreviewElement.addEventListener('load', () => this.ImageEffectManager.init(this.imagePreviewElement))
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