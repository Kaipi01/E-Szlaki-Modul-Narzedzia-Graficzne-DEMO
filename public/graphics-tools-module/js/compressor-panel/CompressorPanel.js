"use strict";

import { formatFileSize } from "../utils/file-helpers.js";
import InputFileManager from "../components/OperationPanel/InputFileManager.js";
import UploadService from "../components/OperationPanel/UploadService.js";
import OperationPanel from "../components/OperationPanel/OperationPanel.js";
import CompressorUIManager from "./CompressorUIManager.js";
import CustomSelect from "../modules/CustomSelect.js";

/** Klasa CompressorPanel służąca do kompresji obrazów */
export default class CompressorPanel extends OperationPanel {

  constructor(container, options = {}) {
    super(container, options)

    // this.resizeSelectElement = this.getByAttribute('data-resize-percent')
    // this.resizeSelect = new CustomSelect(this.resizeSelectElement)
    // this.resizePercentCustomInput = this.getByAttribute('data-resize-percent-custom-input')
    // this.widthInput = this.getByAttribute('data-width-input')
    // this.heightInput = this.getByAttribute('data-height-input')
    // this.strengthInput = this.getByAttribute('data-strength-input')

    // this.state.resize = {
    //   width: null,
    //   height: null,
    //   percent: null
    // }
    // this.state.compressStrength = this.strengthInput.value

    this.initComponents();
    this.initCompressorEvents()
  }

  initCompressorEvents() {
    this.elements.downloadButton.addEventListener("click", () => this.handleDownloadAllImages('skompresowane-grafiki'));

    document.addEventListener(this.EVENT_ON_ALL_IMAGES_COMPLETED, (e) => {
      const imagesTotalSizeAfter = this.state.images.reduce((prevValue, currImg) => prevValue + currImg.savedSize, 0)
      const imagesTotalSizeBefore = this.InputFileManager.getFilesTotalSize()

      this.uiManager.displayCurrentResultMessage("Udało się zaoszczędzić: ", formatFileSize(imagesTotalSizeBefore - imagesTotalSizeAfter))
    })

    document.addEventListener(this.EVENT_ON_CLEAR_TABLE, (e) => {
      this.uiManager.displayCurrentResultMessage("Udało się zaoszczędzić: ", "0 KB")
    })
  }

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
    });

    this.uploadService = new UploadService(this.options, this.uiManager, this.InputFileManager);
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
}