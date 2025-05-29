"use strict";

import InputFileManager from "../../components/InputFileManager.js";
import OperationPanel from "../../components/OperationPanel/OperationPanel.js";
import CustomSelect from "../../modules/CustomSelect.js";
import Popover from "../../modules/Popover.js";
import Toast from "../../modules/Toast.js";
import ConverterUploadService from "./ConverterUploadService.js";
import UIConverterManager from "./UIConverterManager.js"; 

customElements.define("custom-popover", Popover);

/** Klasa ConverterPanel służąca do konwertowania obrazów */
export default class ConverterPanel extends OperationPanel {

  constructor(container, options = {}) {
    super(container, options);

    this.formatSelectElement = this.getByAttribute('data-format-select')
    this.renderFormatSelectOptions()
    this.formatSelect = new CustomSelect(this.formatSelectElement);
    /** @type {HTMLInputElement} */
    this.qualityInput = this.getByAttribute('data-quality-input')
    /** @type {HTMLInputElement} */
    this.addCompressCheckbox = this.getByAttribute('data-add-compress-checkbox')

    this.state.quality = this.qualityInput.value
    this.state.selectedFormat = this.formatSelect.getCurrentValue()
    this.state.addCompressIsChecked = this.addCompressCheckbox.checked

    this.initComponents();
    this.initConverterEvents()
  }

  renderFormatSelectOptions() {
    const mimeFormats = this.options.allowedTypes
    /** @param {string} format */
    const displayFriendlyFormatName = (format) => format.replace('image/', '').toUpperCase();
    let optionsHTML = ''

    if (mimeFormats.length === 0) {
      console.warn('Brak formatów grafik do wygenerowania!')
    }

    optionsHTML += `<option hidden value="">Wybierz Docelowy Format</option>`

    mimeFormats.forEach(format => {
      optionsHTML += `<option value="${format}">${displayFriendlyFormatName(format)}</option>`
    })

    this.formatSelectElement.innerHTML = optionsHTML
  }

  initConverterEvents() {
    this.elements.downloadButton.addEventListener("click", () => this.handleDownloadAllImages('skonwertowane-grafiki'));

    this.formatSelect.onChangeSelect((e) => this.state.selectedFormat = e.detail.value)

    this.qualityInput.addEventListener('input', (e) => this.state.quality = e.target.value)

    this.addCompressCheckbox.addEventListener('change', (e) => this.state.addCompressIsChecked = e.target.checked)

    document.addEventListener(this.EVENT_ON_FILE_INPUT_SELECT, (e) => {
      const {quality, selectedFormat} = this.state

      if (quality <= 0 || quality > 100) {
        throw new Error(Toast.ERROR, `Podano nie poprawną wartość dla pola jakość: ${quality}`)
      }

      if (! this.options.allowedTypes.includes(selectedFormat)) {
        throw new Error(Toast.ERROR, `Format: ${selectedFormat} nie jest obsługiwany!`)
      }
    })

    document.addEventListener(this.EVENT_ON_ALL_IMAGES_COMPLETED, (e) => {
      const convertedImagesNumber = this.state.images.length

      this.uiManager.displayCurrentResultMessage("Liczba Skonwertowanych Grafik: ", convertedImagesNumber)
    })

    document.addEventListener(this.EVENT_ON_CLEAR_TABLE, (e) => {
      this.uiManager.displayCurrentResultMessage("Liczba Skonwertowanych Grafik: ", 0)
    })
  }

  getSelectedFormat = () => this.state.selectedFormat

  getSelectedQuality = () => this.state.quality 

  getAddCompressIsChecked = () => this.state.addCompressIsChecked

  initComponents() {

    this.InputFileManager = new InputFileManager({
      ...this.options,
      onFileAdded: this.handleFileAdded.bind(this),
      onFileRemoved: this.handleFileRemove.bind(this),
      onError: this.showError.bind(this),
    });

    this.uiManager = new UIConverterManager(this.elements, {
      ...this.options,
      onFileSelect: this.handleFileSelect.bind(this),
      onFileRemove: this.handleFileRemove.bind(this),
      onClear: this.handleClear.bind(this),
      onError: this.showError.bind(this),
      getSelectedFormat: this.getSelectedFormat.bind(this)
    });

    this.uploadService = new ConverterUploadService(
      {
        ...this.options, 
        getSelectedFormat: this.getSelectedFormat.bind(this),
        getSelectedQuality: this.getSelectedQuality.bind(this),
        getAddCompressIsChecked: this.getAddCompressIsChecked.bind(this)
      }, 
      this.uiManager, 
      this.InputFileManager
    );
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
      newFileName: image.newName,
      afterSize: image.conversionSize,
      downloadURL: image.downloadURL,
      quality: image.conversionQuality
    });
    this.uiManager.updateFileProgress(fileName, 100);

    const imageDataIndex = this.state.images.findIndex((i) => i.name === fileName);

    if (imageDataIndex !== -1) {
      const imageData = this.state.images[imageDataIndex];

      imageData.isOperationComplete = true;
      imageData.hash = operationHash;
      imageData.savedSize = image.conversionSize
    }

    if (!this.state.allOperationsCompleted) {
      this.handleAllImagesCompleted("Wszystkie obrazy zostały pomyślnie skonwertowane!");
    }

    progressNameElement.textContent = "Zakończono";
  }

  validateState() {
    const {quality, selectedFormat} = this.state

    console.info(this.state)

    if (!quality || quality < 1 || quality > 100) {
      throw new Error(`Podano nie poprawną wartość dla jakości konwersji: ${quality}%`);
    }

    if (selectedFormat == '' || !selectedFormat) {
      throw new Error("Nie podano docelowego formatu!")
    }

    if (! this.options.allowedTypes.includes(selectedFormat)) {
      throw new Error(`Ten format nie jest obługiwany: ${selectedFormat}`)
    }
  }
}