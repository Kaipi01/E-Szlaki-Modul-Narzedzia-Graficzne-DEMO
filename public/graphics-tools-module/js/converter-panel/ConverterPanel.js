"use strict";

import InputFileManager from "../components/OperationPanel/InputFileManager.js";
import OperationPanel from "../components/OperationPanel/OperationPanel.js";
import CustomSelect from "../modules/CustomSelect.js";
import Popover from "../modules/Popover.js";
import RangeSlider from "../modules/RangeSlider.js";
import ConverterUploadService from "./ConverterUploadService.js";
import UIConverterManager from "./UIConverterManager.js"; 

customElements.define("custom-popover", Popover);
customElements.define('range-slider', RangeSlider);

/** Klasa ConverterPanel służąca do konwertowania obrazów */
export default class ConverterPanel extends OperationPanel {

  constructor(container, options = {}) {
    super(container, options);

    this.formatSelectElement = this.getByAttribute('data-format-select')
    this.renderFormatSelectOptions()
    this.formatSelect = new CustomSelect(this.formatSelectElement);
    this.qualitySlider = new RangeSlider(this.container)

    this.state.selectedFormat = this.formatSelect.getCurrentValue()

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

    document.addEventListener(this.EVENT_ON_ALL_IMAGES_COMPLETED, (e) => {
      const convertedImagesNumber = this.state.images.length

      this.uiManager.displayCurrentResultMessage("Liczba Skonwertowanych Grafik: ", convertedImagesNumber)
    })

    document.addEventListener(this.EVENT_ON_CLEAR_TABLE, (e) => {
      this.uiManager.displayCurrentResultMessage("Liczba Skonwertowanych Grafik: ", 0)
    })
  }

  getSelectedFormat = () => this.state.selectedFormat

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
      getSelectedFormat: this.getSelectedFormat.bind(this)
    });

    this.uploadService = new ConverterUploadService(
      {...this.options, getSelectedFormat: this.getSelectedFormat.bind(this)}, 
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
}