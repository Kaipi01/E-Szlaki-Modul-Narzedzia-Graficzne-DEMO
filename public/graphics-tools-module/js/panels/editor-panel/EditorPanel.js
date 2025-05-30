'use strict';

import DropZoneManager from "../../components/DropZoneManager.js";
import InputFileManager from "../../components/InputFileManager.js";
import AbstractPanel from "../../modules/AbstractPanel.js"
import CustomSelect from "../../modules/CustomSelect.js";
import Modal from "../../modules/Modal.js";
import Toast from "../../modules/Toast.js";
import { GRAPHICS_TOOLS_MODULE } from "../../utils/constants.js"

export default class EditorPanel extends AbstractPanel {

  CONFIRM_MODAL_ID = GRAPHICS_TOOLS_MODULE.CONFIRM_MODAL_ID

  static EFFECTS_VALUES_DEFAULT = {
    blur: 0,
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    saturation: 100,
    sepia: 0,
    hueRotate: 0,
    invert: false
  };

  /**
   * @param {HTMLElement | string} container
   * @param {Object} options - Opcje konfiguracyjne
   * @param {string} options.exportImageUrl - URL endpointu do zapisania obrazu
   * @param {string} options.getImageDataUrl - URL endpointu do pobrania danych obrazu 
   * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
   * @param {Array}  options.allowedTypes - Dozwolone typy plików
   *
   * @typedef {Object} EffectsState
   * @property {number} blur 
   * @property {number} brightness 
   * @property {number} contrast 
   * @property {number} grayscale 
   * @property {number} saturation 
   * @property {number} sepia 
   * @property {number} hueRotate 
   * @property {boolean} invert 
   * 
   * @typedef {Object} EditorState
   * @property {File | null} image - Aktualny obraz.
   * @property {EffectsState} effectsValues - Aktualne efekty.
   * @property {Object | null} cropper 
   * @property {Object | null} originalImageData 
   * @property {string} currentTab 
   * @property {boolean} isCropperActive 
   * @property {Object} currentChanges
   */
  constructor(container, options = {}) {
    super(container);

    this.options = options

    /** @type {EditorState} */
    this.state = {
      image: null,
      cropper: null,
      originalImageData: null,
      currentTab: 'crop',
      isCropperActive: true,
      effectsValues: EditorPanel.EFFECTS_VALUES_DEFAULT,
      currentChanges: {}
    };

    // Elementy DOM
    this.editorActionsContainer = this.container.querySelector('#editor-actions')
    this.previewContainer = this.container.querySelector('#preview-container');
    this.previewImage = this.container.querySelector('#preview-image');
    this.exportButton = this.container.querySelector('#export-button');
    this.removeImageButton = this.container.querySelector('#remove-image-button')
    this.tabButtons = this.container.querySelectorAll('.tab-button');
    this.tabPanes = this.container.querySelectorAll('.tab-pane');
    this.editorContent = this.container.querySelector('#editor-content')
    this.editorTabs = this.container.querySelector('#editor-tabs')
    this.containerAlerts = this.getByAttribute("data-operation-alerts")

    // Elementy formularza
    this.cropWidthInput = this.container.querySelector('#crop-width');
    this.cropHeightInput = this.container.querySelector('#crop-height');
    this.aspectRatioSelect = new CustomSelect(this.container.querySelector('#aspect-ratio'))

    this.aspectRatioSelect.disabled()

    this.rotationAngleInput = this.container.querySelector('#rotation-angle');
    this.rotateLeftBtn = this.container.querySelector('#rotate-left');
    this.rotateRightBtn = this.container.querySelector('#rotate-right');
    this.flipHorizontalBtn = this.container.querySelector('#flip-horizontal');
    this.flipVerticalBtn = this.container.querySelector('#flip-vertical');

    // Elementy efektów
    this.effectSliders = this.container.querySelectorAll('.effect-slider');
    this.effectResetButtons = this.container.querySelectorAll('.effect-reset');
    this.invertCheckbox = this.container.querySelector('#effect-invert');

    this.cropToggleCheckbox = this.container.querySelector('#crop-toggle-checkbox');

    this.resetAllButton = this.container.querySelector('#reset-all-button');

    this.filterLayer = null;
    this.filterLayerBackground = null;

    // Drop Zone
    this.dropZoneElement = this.getByAttribute('data-drop-zone')
    this.fileInput = this.getByAttribute('data-file-input')

    this.initComponents()
    this.setEventsListeners()

    this.englishEffectsNameToPolish = new Map()

    // Podstawowe efekty
    this.englishEffectsNameToPolish.set('brightness', 'jasność');
    this.englishEffectsNameToPolish.set('contrast', 'kontrast');
    this.englishEffectsNameToPolish.set('saturation', 'nasycenie');
    this.englishEffectsNameToPolish.set('blur', 'rozmycie');
    this.englishEffectsNameToPolish.set('grayscale', 'skala szarości');
    this.englishEffectsNameToPolish.set('sepia', 'sepia');
    this.englishEffectsNameToPolish.set('hue-rotate', 'rotacja barw');
    this.englishEffectsNameToPolish.set('invert', 'negatyw');

    // Parametry przycinania
    this.englishEffectsNameToPolish.set('crop', 'przycięcie');
    this.englishEffectsNameToPolish.set('width', 'szerokość');
    this.englishEffectsNameToPolish.set('height', 'wysokość');
    this.englishEffectsNameToPolish.set('x', 'pozycja X');
    this.englishEffectsNameToPolish.set('y', 'pozycja Y');

    // Proporcje
    this.englishEffectsNameToPolish.set('aspectRatio', 'proporcje');
    this.englishEffectsNameToPolish.set('free', 'dowolne');
    this.englishEffectsNameToPolish.set('1:1', '1:1');
    this.englishEffectsNameToPolish.set('4:3', '4:3');
    this.englishEffectsNameToPolish.set('16:9', '16:9');

    // Obrót i odbicie
    this.englishEffectsNameToPolish.set('rotate', 'obrót');
    this.englishEffectsNameToPolish.set('scaleX', 'odbicie poziome');
    this.englishEffectsNameToPolish.set('scaleY', 'odbicie pionowe');
  }

  /**
   * @param {string} name - Nazwa parametru w języku angielskim
   * @param {any} value - Wartość parametru
   */
  updateCurrentChanges(name, value) {
    const polishName = this.englishEffectsNameToPolish.get(name) || name;

    const formatValue = (name, value) => {
      if (typeof value === 'string') {
        return this.englishEffectsNameToPolish.get(value) || value;
      }

      if (typeof value === 'number') {
        if (name === 'scaleX' || name === 'scaleY') {
          return value < 0 ? 'włączone' : 'wyłączone';
        }

        if (name === 'blur') return `${value}px`;
        if (name === 'rotate' || name === 'hue-rotate') return `${value}°`;
        if (['brightness', 'contrast', 'saturation', 'grayscale', 'sepia'].includes(name)) return `${value}%`;

        return value;
      }

      if (typeof value === 'boolean') {
        return value ? 'włączone' : 'wyłączone';
      }

      return value;
    }

    if (value !== null && typeof value === 'object') {
      if (!this.state.currentChanges[polishName]) {
        this.state.currentChanges[polishName] = {};
      }

      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const polishKey = this.englishEffectsNameToPolish.get(key) || key;
          this.state.currentChanges[polishName][polishKey] = formatValue(key, value[key]);
        }
      }
      return;
    }

    this.state.currentChanges[polishName] = formatValue(name, value);
  }

  resetCurrentChanges() {
    this.state.currentChanges = {}
  }

  getCurrentChangesJSON() {
    return JSON.stringify(this.state.currentChanges)
  }

  initComponents() {
    this.InputFileManager = new InputFileManager({
      ...this.options,
      onFileAdded: this.handleFileAdded.bind(this),
      onFileRemoved: this.handleFileRemove.bind(this),
      onError: this.showError.bind(this),
    });

    this.DropZone = new DropZoneManager(this.dropZoneElement, (droppedFiles) => this.InputFileManager.addFiles(droppedFiles))
  }

  initCropper() {
    if (this.state.cropper) {
      this.state.cropper.destroy();
    }

    this.state.cropper = new Cropper(this.previewImage, {
      viewMode: 1,
      dragMode: 'crop',
      autoCropArea: 1,
      restore: false,
      modal: true,
      guides: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      ready: () => {
        this.updateCropBoxInputs();

        if (this.state.currentTab === 'rotate') {
          this.state.cropper.setDragMode('move');
        } else if (this.state.currentTab === 'effects') {
          this.state.cropper.setDragMode('none');
        }

        this.initFilterLayers();
        this.setupEffectsHandlers();
        this.hideCropper();
      },
      crop: (event) => {
        const data = event.detail;

        // Aktualizacja inputów tylko gdy użytkownik zmienia rozmiar ręcznie
        if (!this.cropWidthInput.matches(':focus') && !this.cropHeightInput.matches(':focus')) {
          this.cropWidthInput.value = Math.round(data.width);
          this.cropHeightInput.value = Math.round(data.height);
        }

        this.updateCurrentChanges('crop', {
          x: Math.round(data.x),
          y: Math.round(data.y),
          width: Math.round(data.width),
          height: Math.round(data.height)
        });
      }
    });
  }

  setEventsListeners() {
    this.fileInput.addEventListener('change', (e) => this.handleSelectFile(e))

    this.removeImageButton.addEventListener('click', () => this.removeImageButtonHandler())

    this.exportButton.addEventListener('click', () => this.exportImage())

    this.cropToggleCheckbox.addEventListener('change', (e) => {
      const { cropper, isCropperActive } = this.state

      if (cropper && isCropperActive) {
        cropper.setAspectRatio(NaN);
        this.updateCropBoxInputs();

        const aspectRatioSelect = document.getElementById('aspect-ratio');
        if (aspectRatioSelect) {
          aspectRatioSelect.value = 'free';
        }
      }

      if (e.target.checked) {
        this.cropHeightInput.removeAttribute('disabled')
        this.cropWidthInput.removeAttribute('disabled')
        this.aspectRatioSelect.enabled()

        this.showCropper();
      } else {
        this.cropHeightInput.setAttribute('disabled', 'true')
        this.cropWidthInput.setAttribute('disabled', 'true')
        this.aspectRatioSelect.disabled()

        this.hideCropper();
      }
    });

    // Obsługa kliknięcia przycisku resetowania
    this.resetAllButton.addEventListener('click', () => this.resetSettingsButtonHandler());

    // Obsługa przełączania zakładek
    this.tabButtons.forEach(button => {
      button.addEventListener('click', (e) => this.tabButtonClickHandler(e));
    });

    this.cropWidthInput.addEventListener('change', (e) => {
      const cropper = this.state.cropper;
      if (cropper) {
        const width = parseInt(e.target.value);

        if (width > 0) {
          const data = cropper.getData();
          data.width = width;
          cropper.setData(data);
        }
      }
    });

    this.cropHeightInput.addEventListener('change', (e) => {
      const cropper = this.state.cropper;
      if (cropper) {
        const height = parseInt(e.target.value);
        if (height > 0) {
          const data = cropper.getData();
          data.height = height;
          cropper.setData(data);
        }
      }
    }); 

    this.aspectRatioSelect.onChangeSelect((e) => {
      const cropper = this.state.cropper;
      if (cropper) {
        const value = e.detail.value;
        let aspectRatio;

        switch (value) {
          case '1:1':
            aspectRatio = 1;
            break;
          case '4:3':
            aspectRatio = 4 / 3;
            break;
          case '16:9':
            aspectRatio = 16 / 9;
            break;
          default:
            aspectRatio = NaN; // Dowolne proporcje
        }

        cropper.setAspectRatio(aspectRatio);

        if (isNaN(aspectRatio)) {
          this.centerCrop()
        } 

        this.updateCropBoxInputs();

        this.updateCurrentChanges('aspectRatio', value);
      }
    });

    this.rotationAngleInput.addEventListener('change', (e) => {
      const cropper = this.state.cropper;

      if (cropper) {
        const angle = parseInt(e.target.value) || 0;
        cropper.rotateTo(angle);

        this.updateCurrentChanges('rotate', angle)
      }
    });

    this.rotateLeftBtn.addEventListener('click', () => {
      const cropper = this.state.cropper;
      if (cropper) {
        cropper.rotate(-90);
        this.updateRotationAngle();
      }
    });

    this.rotateRightBtn.addEventListener('click', () => {
      const cropper = this.state.cropper;
      if (cropper) {
        cropper.rotate(90);
        this.updateRotationAngle();
      }
    });

    this.flipHorizontalBtn.addEventListener('click', () => {
      const cropper = this.state.cropper;
      if (cropper) {
        const newScaleX = -cropper.getData().scaleX || -1;
        cropper.scaleX(newScaleX);

        this.updateCurrentChanges('scaleX', newScaleX);
      }
    });

    this.flipVerticalBtn.addEventListener('click', () => {
      const cropper = this.state.cropper;
      if (cropper) {
        const newScaleY = -cropper.getData().scaleY || -1;
        cropper.scaleY(newScaleY);

        this.updateCurrentChanges('scaleY', newScaleY);
      }
    });
  }

  /** @param {MouseEvent} e  */
  tabButtonClickHandler(e) {
    const tab = e.target.dataset.tab;

    // Aktywacja przycisku zakładki
    this.tabButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    // Aktywacja zawartości zakładki
    this.tabPanes.forEach(pane => pane.classList.remove('active'));
    document.getElementById(`${tab}-tab`).classList.add('active');

    this.state.currentTab = tab;
    const cropper = this.state.cropper
    // Aktualizacja ustawień croppera w zależności od zakładki
    if (cropper) {
      if (tab === 'crop') {
        cropper.setDragMode('crop');
      } else if (tab === 'rotate') {
        cropper.setDragMode('move');
      } else if (tab === 'effects') {
        cropper.setDragMode('none');
      }
    }
  }

  removeImageButtonHandler() {
    Modal.show(this.CONFIRM_MODAL_ID);

    const modal = Modal.get(this.CONFIRM_MODAL_ID);
    const modalMessage = modal.querySelector('[data-message]');
    const confirmBtn = modal.querySelector('[data-confirm-btn]');
    const denyBtn = modal.querySelector('[data-deny-btn]');

    denyBtn.onclick = (e) => Modal.hide(this.CONFIRM_MODAL_ID);

    confirmBtn.onclick = (e) => {
      this.editorActionsContainer.setAttribute('hidden', '')
      this.dropZoneElement.removeAttribute('hidden')
      this.previewContainer.setAttribute('hidden', '')
      this.editorTabs.setAttribute('hidden', '')
      this.editorContent.classList.add('editor-content--no-image')

      if (this.state.cropper) {
        this.state.cropper.destroy();
      }

      this.state.image = null
      this.state.effectsValues = EditorPanel.EFFECTS_VALUES_DEFAULT
      this.state.cropper = null
      this.state.originalImageData = null
      this.state.isCropperActive = true;
      this.state.currentChanges = {}

      this.resetAllSettings();

      Toast.show(Toast.INFO, "Grafika została usunięta")

      Modal.hide(this.CONFIRM_MODAL_ID);
    };

    modalMessage.textContent = "Czy na pewno chcesz usunąć aktualnie przerabianą grafikę?"
  }

  resetSettingsButtonHandler() {
    Modal.show(this.CONFIRM_MODAL_ID);

    const modal = Modal.get(this.CONFIRM_MODAL_ID);
    const modalMessage = modal.querySelector('[data-message]');
    const confirmBtn = modal.querySelector('[data-confirm-btn]');
    const denyBtn = modal.querySelector('[data-deny-btn]');

    denyBtn.onclick = (e) => Modal.hide(this.CONFIRM_MODAL_ID);

    confirmBtn.onclick = (e) => {
      this.resetAllSettings();

      Toast.show(Toast.INFO, "Wszystkie ustawienia zostały zresetowane")

      Modal.hide(this.CONFIRM_MODAL_ID);
    };

    modalMessage.textContent = "Czy na pewno chcesz zresetować wszystkie ustawienia?"
  }

  initFilterLayers() {
    const cropperContainer = document.querySelector('.cropper-container');

    this.filterLayer = cropperContainer.querySelector('.cropper-view-box > img')
    this.filterLayerBackground = cropperContainer.querySelector('.cropper-canvas > img')
  }

  updateCropBoxInputs() {
    if (this.state.cropper) {
      const data = this.state.cropper.getData();
      this.cropWidthInput.value = Math.round(data.width);
      this.cropHeightInput.value = Math.round(data.height);
    }
  }

  updateRotationAngle() {
    if (this.state.cropper) {
      const data = this.state.cropper.getData();
      this.rotationAngleInput.value = Math.round(data.rotate);
      this.updateCurrentChanges('rotate', Math.round(data.rotate));
    }

  }

  setupEffectsHandlers() {
    this.effectSliders.forEach(slider => {
      const effectId = slider.id;
      const valueDisplay = slider.parentElement.querySelector('.effect-value');
      let effectName = effectId.replace('effect-', '');

      if (effectName !== 'hue-rotate') {
        effectName = effectName.replace('-', '');
      }

      // Ustaw początkowe wartości
      this.updateEffectValueDisplay(slider, valueDisplay);

      slider.addEventListener('input', (e) => {
        // Aktualizuj wartość w obiekcie efektów
        if (effectName === 'hue-rotate') {
          this.state.effectsValues.hueRotate = parseInt(e.target.value);
          this.updateCurrentChanges('hue-rotate', parseInt(e.target.value));
        } else {
          this.state.effectsValues[effectName] = parseInt(e.target.value);
          this.updateCurrentChanges(effectName, parseInt(e.target.value));
        }

        this.updateEffectValueDisplay(e.target, valueDisplay);
        this.applyEffects();
      });
    });

    // Obsługa przycisku resetowania dla każdego efektu
    this.effectResetButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const effectName = e.target.dataset.effect;
        const slider = document.getElementById(`effect-${effectName.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
        const effectsValues = this.state.effectsValues

        if (effectName === 'invert') {
          this.updateCurrentChanges(effectName, false);
        } else if (effectName === 'brightness' || effectName === 'contrast' || effectName === 'saturation') {
          this.updateCurrentChanges(effectName, 100);
        } else {
          this.updateCurrentChanges(effectName, 0);
        }

        switch (effectName) {
          case 'blur':
            effectsValues.blur = 0;
            slider.value = 0;
            break;
          case 'brightness':
          case 'contrast':
          case 'saturation':
            effectsValues[effectName] = 100;
            slider.value = 100;
            break;
          case 'grayscale':
          case 'sepia':
            effectsValues[effectName] = 0;
            slider.value = 0;
            break;
          case 'hue-rotate':
            effectsValues.hueRotate = 0;
            slider.value = 0;
            break;
          case 'invert':
            effectsValues.invert = false;
            this.invertCheckbox.checked = false;
            break;
        }

        const valueDisplay = slider ? slider.parentElement.querySelector('.effect-value') : null;

        if (valueDisplay) {
          this.updateEffectValueDisplay(slider, valueDisplay);
        }

        this.applyEffects();
      });
    });

    this.invertCheckbox.addEventListener('change', (e) => {
      this.state.effectsValues.invert = e.target.checked;
      this.updateCurrentChanges('invert', e.target.checked);
      this.applyEffects();
    });
  }

  updateEffectValueDisplay(slider, valueDisplay) {
    if (!slider || !valueDisplay) return;

    const effectId = slider.id;
    let unit = '';

    if (effectId.includes('blur')) {
      unit = 'px';
    } else if (effectId.includes('hue-rotate')) {
      unit = 'deg';
    } else {
      unit = '%';
    }

    valueDisplay.textContent = `${slider.value}${unit}`;
  }

  applyEffects() {
    const { cropper, effectsValues } = this.state

    if (!cropper || !this.filterLayer) return;

    // Budowanie stringa CSS filter
    let filterString = '';

    if (effectsValues.blur > 0) {
      filterString += `blur(${effectsValues.blur}px) `;
    }

    if (effectsValues.brightness !== 100) {
      filterString += `brightness(${effectsValues.brightness}%) `;
    }

    if (effectsValues.contrast !== 100) {
      filterString += `contrast(${effectsValues.contrast}%) `;
    }

    if (effectsValues.grayscale > 0) {
      filterString += `grayscale(${effectsValues.grayscale}%) `;
    }

    if (effectsValues.saturation !== 100) {
      filterString += `saturate(${effectsValues.saturation}%) `;
    }

    if (effectsValues.sepia > 0) {
      filterString += `sepia(${effectsValues.sepia}%) `;
    }

    if (effectsValues.hueRotate > 0) {
      filterString += `hue-rotate(${effectsValues.hueRotate}deg) `;
    }

    if (effectsValues.invert) {
      filterString += `invert(100%) `;
    }

    // Zastosowanie filtrów do warstwy filtrów
    this.filterLayer.style.filter = filterString;
    this.filterLayerBackground.style.filter = filterString;

    // Dodaj tło z mixBlendMode, aby efekty działały poprawnie
    this.filterLayer.style.background = 'transparent';
    this.filterLayer.style.mixBlendMode = 'normal';

    this.filterLayerBackground.style.background = 'transparent';
    this.filterLayerBackground.style.mixBlendMode = 'normal';
  }

  async getImageBlob(mimeType = 'image/png') {
    const cropper = this.state.cropper

    if (!cropper) {
      throw new Error('Wystąpił błąd podaczas eksportu grafiki !')
    }

    const canvas = cropper.getCroppedCanvas({
      minWidth: 256,
      minHeight: 256,
      maxWidth: 4096,
      maxHeight: 4096,
      fillColor: 'transparent',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    if (!canvas) {
      throw new Error('Wystąpił błąd podaczas eksportu grafiki !')
    }

    // Tworzenie nowego canvas do zastosowania efektów
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const ctx = finalCanvas.getContext('2d');

    // Narysuj oryginalny obraz na nowym canvas
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

    // Zastosuj efekty przy użyciu filtrów CSS
    ctx.filter = this.filterLayer.style.filter;

    // Narysuj obraz ponownie z zastosowanymi filtrami
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(tempCanvas, 0, 0);

    return new Promise(resolve => finalCanvas.toBlob(blob => resolve(blob), mimeType, 1))
  }

  async exportImage() {
    const { name: imageName, type: mimeType } = this.state.image
    const formData = new FormData()
    const imageBlob = await this.getImageBlob(mimeType)

    this.exportButton.innerHTML = '<i class="fas fa-download"></i> Trwa Eksportowanie. Proszę czekać ...'
    this.exportButton.classList.add('loading-btn-icon')   

    formData.append('imageBlob', imageBlob, imageName)
    formData.append('imageChanges', this.getCurrentChangesJSON())
    formData.append('toFormat', mimeType)

    try {
      const response = await fetch(this.options.exportImageUrl, {
        method: 'POST',
        body: formData
      })
      const responseData = await response.json()

      if (!response.ok) {
        this.showError("Wystąpił błąd podczas zapisywania grafiki: " + responseData.errorMessage)
      }
    } catch (error) {
      this.showError(error.message)

    } finally {
      const link = document.createElement('a');

      link.href = URL.createObjectURL(imageBlob);
      link.download = imageName;
      link.click();
      URL.revokeObjectURL(link.href);

      Toast.show(Toast.SUCCESS, "Obraz został pomyślnie wyeksportowany!")

      this.exportButton.innerHTML = '<i class="fas fa-download"></i> Eksportuj'
      this.exportButton.classList.remove('loading-btn-icon')
    }
  }

  /** Funkcja resetująca wszystkie ustawienia */
  resetAllSettings() {
    this.resetAllFilters();
    this.resetCropping();
    this.resetRotation();
    this.resetCurrentChanges();
  }

  /** Funkcja resetująca wszystkie filtry */
  resetAllFilters() {
    // Resetuj wartości wszystkich suwaków
    const effectSliders = document.querySelectorAll('.effect-slider');

    effectSliders.forEach(slider => {
      const effectId = slider.id;

      // Ustaw domyślne wartości w zależności od typu efektu
      if (effectId.includes('brightness') || effectId.includes('contrast') || effectId.includes('saturation')) {
        slider.value = 100;
      } else if (effectId.includes('hue-rotate')) {
        slider.value = 0;
      } else if (effectId.includes('blur') || effectId.includes('grayscale') || effectId.includes('sepia')) {
        slider.value = 0;
      }

      // Aktualizuj wyświetlanie wartości
      const valueDisplay = slider.parentElement.querySelector('.effect-value');
      if (valueDisplay) {
        this.updateEffectValueDisplay(slider, valueDisplay);
      }
    });

    // Resetuj checkbox invert
    const invertCheckbox = document.getElementById('effect-invert');
    if (invertCheckbox) {
      invertCheckbox.checked = false;
    }

    // Resetuj stan edytora
    this.state.effectsValues = {
      blur: 0,
      brightness: 100,
      contrast: 100,
      grayscale: 0,
      saturation: 100,
      sepia: 0,
      hueRotate: 0,
      invert: false
    };

    this.applyEffects();
  }

  showCropper() {
    const cropperActionElements = this.container.querySelectorAll('[data-cropper-action]')
    const cropperDashedElements = this.container.querySelectorAll('.cropper-dashed')
    const cropperCenterElement = this.container.querySelector('.cropper-center')
    const cropperViewBox = this.container.querySelector('.cropper-view-box')

    cropperActionElements.forEach(cropperAction => cropperAction.removeAttribute('hidden'))
    cropperDashedElements.forEach(cropperAction => cropperAction.removeAttribute('hidden'))
    cropperCenterElement?.removeAttribute('hidden')

    if (cropperViewBox) {
      cropperViewBox.style.overflow = 'hidden'
    }

    this.centerCrop() 
  }

  centerCrop() {
    const cropper = this.state.cropper
    const canvasData = cropper.getCanvasData();
    const cropWidth = canvasData.width * 0.8;
    const cropHeight = canvasData.height * 0.8;
    const cropLeft = canvasData.left + (canvasData.width - cropWidth) / 2;
    const cropTop = canvasData.top + (canvasData.height - cropHeight) / 2;

    cropper.setCropBoxData({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    });
  }

  hideCropper() {
    const cropperActionElements = this.container.querySelectorAll('[data-cropper-action]')
    const cropperDashedElements = this.container.querySelectorAll('.cropper-dashed')
    const cropperCenterElement = this.container.querySelector('.cropper-center')
    const cropperViewBox = this.container.querySelector('.cropper-view-box')

    cropperActionElements.forEach(cropperAction => cropperAction.setAttribute('hidden', ''))
    cropperDashedElements.forEach(cropperAction => cropperAction.setAttribute('hidden', ''))
    cropperCenterElement?.setAttribute('hidden', '')

    if (cropperViewBox) {
      cropperViewBox.style.overflow = 'initial'
    }
  }

  /** Funkcja resetująca przycinanie */
  resetCropping() {
    const { cropper, isCropperActive } = this.state

    if (cropper && isCropperActive) {
      // Resetuj obszar przycinania do domyślnego
      cropper.reset();
      cropper.setAspectRatio(NaN); // Resetuj proporcje

      // Aktualizuj inputy
      this.updateCropBoxInputs();

      // Resetuj select z proporcjami
      const aspectRatioSelect = document.getElementById('aspect-ratio');
      if (aspectRatioSelect) {
        aspectRatioSelect.value = 'free';
      }
    }
  }

  /** Funkcja resetująca obrót */
  resetRotation() {
    const { cropper } = this.state

    if (cropper) {
      // Resetuj obrót
      const canvasData = cropper.getCanvasData()
      const rotationAngleInput = document.getElementById('rotation-angle');
      const data = cropper.getData();

      if (canvasData.width >= canvasData.height) {
        cropper.rotateTo(0)
      } else {
        cropper.rotateTo(-90) // dla grafik pionowych
      }

      // Resetuj skalowanie (odbicie)
      if (data.scaleX < 0) {
        cropper.scaleX(1);
      }
      if (data.scaleY < 0) {
        cropper.scaleY(1);
      }

      // Aktualizuj input z kątem obrotu
      if (rotationAngleInput) {
        rotationAngleInput.value = 0;
      }
    }
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
  }

  /**
   * Renderuje obraz na podstawie wrzuconej grafiki do input-a 
   * @param {File} file – obraz wybrany przez użytkownika 
   */
  renderImage(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      this.state.originalImageData = e.target.result;

      this.previewImage.src = this.state.originalImageData;
      this.dropZoneElement.setAttribute('hidden', '')
      this.previewContainer.removeAttribute('hidden')

      this.previewImage.onload = () => {
        this.initCropper();
        this.editorActionsContainer.removeAttribute('hidden')
        this.editorTabs.removeAttribute('hidden')
        this.editorContent.classList.remove('editor-content--no-image')
        this.containerAlerts.innerHTML = ''
        this.containerAlerts.setAttribute('hidden', '')
      };
    };

    reader.onerror = () => new Error('Błąd odczytu pliku przez FileReader');
    reader.readAsDataURL(file);
  }

  /** @param {string} message - Treść komunikatu */
  showError(message) {
    this.containerAlerts.innerHTML = ''
    this.containerAlerts.removeAttribute('hidden')
    super.showError(message, this.containerAlerts);
  }
}