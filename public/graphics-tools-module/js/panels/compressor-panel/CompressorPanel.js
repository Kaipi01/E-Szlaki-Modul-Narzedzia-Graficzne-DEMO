"use strict";

import { formatFileSize } from "../../utils/file-helpers.js";
import InputFileManager from "../../components/InputFileManager.js";
import OperationPanel from "../../components/OperationPanel/OperationPanel.js";
import CompressorUIManager from "./CompressorUIManager.js";
import CustomSelect from "../../modules/CustomSelect.js";
import CustomTabs from "../../modules/CustomTabs.js";
import Popover from "../../modules/Popover.js";
import CompressorUploadService from "./CompressorUploadService.js"; 

customElements.define("custom-popover", Popover);

/** Klasa CompressorPanel służąca do kompresji obrazów */
export default class CompressorPanel extends OperationPanel {

  SETTINGS_TAB_RESIZE_PERCENT = "percent-tab"
  SETTINGS_TAB_RESIZE_NUMERIC = "numeric-tab"

  RESIZE_BY_PERCENT = "percent"
  RESIZE_BY_WIDTH = "width"
  RESIZE_BY_HEIGHT = "height"

  constructor(container, options = {}) {
    super(container, options)

    this.dimensionsSettingsEl = this.getByAttribute('data-dimensions-settings')
    this.widthDimensionsTextEl = this.getByAttribute('data-dimension-width-text')
    this.heightDimensionsTextEl = this.getByAttribute('data-dimension-height-text')
    this.setPercentCustomCheckbox = this.getByAttribute('data-set-percent-custom-checkbox')
    this.changeDimensionsCheckbox = this.getByAttribute('data-change-dimensions-checkbox')
    this.toggleDimensionsCheckbox = this.getByAttribute('data-toggle-dimensions-checkbox')
    this.customValueInput = this.getByAttribute('data-custom-value-input')
    this.resizeSelectElement = this.getByAttribute('data-resize-percent')
    this.resizePercentCustomInput = this.getByAttribute('data-resize-percent-custom-input')
    this.qualityInput = this.getByAttribute('data-quality-input')

    this.resizeSelect = new CustomSelect(this.resizeSelectElement)

    this.state.resize = {
      isChange: false,
      width: null,
      height: null,
      percent: null,
      changeBy: this.RESIZE_BY_PERCENT
    }

    this.state.compressQuality = parseInt(this.qualityInput.value)

    this.initComponents();
    this.initCompressorEvents()
  }

  handleSettingsTabsChanged(e) {
    const tabName = e.detail.tab

    if (tabName === this.SETTINGS_TAB_RESIZE_PERCENT) {
      this.state.resize.changeBy = this.RESIZE_BY_PERCENT
    } else {
      this.state.resize.changeBy = this.toggleDimensionsCheckbox.checked ? this.RESIZE_BY_HEIGHT : this.RESIZE_BY_WIDTH
    }
  }

  initCompressorEvents() {
    this.elements.downloadButton.addEventListener("click", () => this.handleDownloadAllImages('skompresowane-grafiki'));

    document.addEventListener(CustomTabs.TAB_CHANGE_EVENT, (e) => this.handleSettingsTabsChanged(e))

    this.qualityInput.addEventListener('input', (e) => this.state.compressQuality = parseInt(this.qualityInput.value))

    this.resizePercentCustomInput.addEventListener('input', (e) => {
      this.state.resize.percent = parseInt(e.target.value)
      this.state.resize.changeBy = this.RESIZE_BY_PERCENT
    })

    this.resizeSelect.onChangeSelect((e) => {
      this.state.resize.percent = parseInt(e.detail.value)
      this.state.resize.changeBy = this.RESIZE_BY_PERCENT
    })

    this.setPercentCustomCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked

      if (isChecked) {
        this.resizeSelect.disabled()
        this.resizePercentCustomInput.removeAttribute('disabled')
        this.state.resize.percent = parseInt(this.resizePercentCustomInput.value)
      } else {
        this.resizeSelect.enabled()
        this.resizePercentCustomInput.setAttribute('disabled', 'true')
        this.state.resize.percent = parseInt(this.resizeSelect.getCurrentValue())
      }
    })

    this.toggleDimensionsCheckbox.addEventListener('change', (e) => {
      const isSetWidth = !e.target.checked
      const currentInputValue = this.customValueInput.value != '' ? parseInt(this.customValueInput.value) : null

      this.widthDimensionsTextEl.classList.toggle('active')
      this.heightDimensionsTextEl.classList.toggle('active')

      if (isSetWidth) {
        this.state.resize.width = currentInputValue
        this.state.resize.changeBy = this.RESIZE_BY_WIDTH
      } else {
        this.state.resize.height = currentInputValue
        this.state.resize.changeBy = this.RESIZE_BY_HEIGHT
      }
    })

    this.customValueInput.addEventListener('input', (e) => {
      const isSetWidth = !this.toggleDimensionsCheckbox.checked

      if (isSetWidth) {
        this.state.resize.width = parseInt(e.target.value)
        this.state.resize.changeBy = this.RESIZE_BY_WIDTH
      } else {
        this.state.resize.height = parseInt(e.target.value)
        this.state.resize.changeBy = this.RESIZE_BY_HEIGHT
      }
    })

    this.changeDimensionsCheckbox.addEventListener('change', (e) => {
      const isChange = e.target.checked

      this.state.resize.isChange = isChange

      if (isChange) {
        this.dimensionsSettingsEl.style.display = ""
      } else {
        this.dimensionsSettingsEl.style.display = "none"
      }
    })

    document.addEventListener(this.EVENT_ON_ALL_IMAGES_COMPLETED, (e) => {
      const imagesTotalSizeAfter = this.state.images.reduce((prevValue, currImg) => prevValue + currImg.savedSize, 0)
      const imagesTotalSizeBefore = this.InputFileManager.getFilesTotalSize()

      this.uiManager.displayCurrentResultMessage("Udało się zaoszczędzić: ", formatFileSize(imagesTotalSizeBefore - imagesTotalSizeAfter))
    })

    document.addEventListener(this.EVENT_ON_CLEAR_TABLE, (e) => {
      this.uiManager.displayCurrentResultMessage("Udało się zaoszczędzić: ", "0 KB")
    })
  }

  getCompressQuality = () => this.state.compressQuality

  getImageResize = () => this.state.resize

  initComponents() {
    this.InputFileManager = new InputFileManager({
      ...this.options,
      onFileAdded: this.handleFileAdded.bind(this),
      onFileRemoved: this.handleFileRemove.bind(this),
      onError: this.showError.bind(this),
    });

    this.uiManager = new CompressorUIManager(this.elements, {
      ...this.options,
      onFileSelect: this.handleFileSelect.bind(this),
      onFileRemove: this.handleFileRemove.bind(this),
      onClear: this.handleClear.bind(this),
      onError: this.showError.bind(this),
    });

    this.uploadService = new CompressorUploadService({
        ...this.options,
        getImageResize: this.getImageResize.bind(this),
        getCompressQuality: this.getCompressQuality.bind(this)
      },
      this.uiManager, this.InputFileManager
    );

    new CustomTabs(this.container)
  }

  /** 
   * @param {string} operationHash 
   * @param {HTMLElement} progressNameElement 
   * @param {string} fileName 
   */
  async onCompleteOperationHandler(operationHash, progressNameElement, fileName) {
    const getImageURL = `${this.options.imageDataUrl}/${operationHash}`;
    const response = await fetch(getImageURL, { method: "GET" });
    const { imageData: image } = await response.json();

    this.uiManager.updateTableAfterOperation({
      fileName: image.originalName,
      compressedSize: image.compressedSize,
      downloadURL: image.downloadURL,
      ratio: image.compressionRatio
    });
    this.uiManager.updateFileProgress(fileName, 100);

    const imageDataIndex = this.state.images.findIndex((i) => i.name === fileName);

    if (imageDataIndex !== -1) {
      const imageData = this.state.images[imageDataIndex];

      imageData.isOperationComplete = true;
      imageData.hash = operationHash;
      imageData.savedSize = image.compressedSize
    }

    if (!this.state.allOperationsCompleted) {
      this.handleAllImagesCompleted("Wszystkie obrazy zostały pomyślnie skompresowane!"); 
    }

    progressNameElement.textContent = "Zakończono";
  }

  validateState() {
    const compressQuality = this.state.compressQuality

    console.info(this.state)

    if (!compressQuality || compressQuality < 1 || compressQuality > 100) {
      throw new Error(`Podano nie poprawną wartość dla siły kompresji: ${compressQuality}%`);
    } 

    const { width, height, percent, changeBy, isChange } = this.state.resize

    if (! isChange) return;

    const checkValue = (value, valueName, displayValueName, valueMax = null) => {
      const valueIsNotValid = value === undefined || value === null || isNaN(value) || value == ''

      if (valueIsNotValid && changeBy === valueName) {
        throw new Error(`Nie podano wartości dla ${displayValueName}`);
      }
      if (value < 1) {
        throw new Error(`Podano zbyt małą wartość ${displayValueName}: ${value}. Minimalna to 1.`);
      }
      if (valueMax !== null && value > valueMax) {
        throw new Error(`Podano zbyt dużą wartość ${displayValueName}: ${value}. Maksymalna to ${valueMax}.`);
      }
    }

    if (!changeBy || changeBy == '') {
      throw new Error('Nie określono metody zmiany rozmiaru');
    }

    switch (changeBy) {
      case 'width':
        checkValue(width, changeBy, 'szerokości')
        break;
      case 'height':
        checkValue(height, changeBy, 'wysokości')
        break;
      case 'percent':
        checkValue(percent, changeBy, 'procentu', 99)
        break;
      default:
        throw new Error(`Nieprawidłowa metoda zmiany rozmiaru: "${changeBy}"`);
    }
  }
}