"use strict";

import Toast from "../modules/Toast.js";
import { formatFileSize } from "../utils/file-helpers.js";
import InputFileManager from "../components/OperationPanel/InputFileManager.js";
import UploadService from "../components/OperationPanel/UploadService.js";
import OperationPanel from "../components/OperationPanel/OperationPanel.js";
import CompressorUIManager from "./CompressorUIManager.js";

/** Klasa CompressorPanel służąca do kompresji obrazów */
export default class CompressorPanel extends OperationPanel {
  
  constructor(container, options = {}) {
    super(container, options)

    this.initComponents();
    this.initCompressorEvents()
  }

  initCompressorEvents() {
    this.elements.downloadButton.addEventListener("click", () => this.handleDownloadAllImages('skompresowane-grafiki'));
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

    this.uiManager.updateTableAfterOperation(
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
      imageData.savedSize = image.compressedSize
    }

    if (!this.state.allOperationsCompleted) {
      this.handleAllImagesCompressed();
    }

    progressNameElement.textContent = "Zakończono";
  }

  /** Sprawdza czy wszystkie grafiki są skompresowane jeśli tak to wyświetla komunikat */
  handleAllImagesCompressed() {
    const allOperationsCompleted = this.state.images.every((i) => i.isOperationComplete);

    this.state.checkResultInterval = setInterval(() => {

      if (this.state.uploading) {
        this.handleAllImagesCompressed()
      } else {
        clearTimeout(this.state.checkResultInterval)
      }
    }, 1000)

    if (allOperationsCompleted) {
      const imagesTotalSizeAfter = this.state.images.reduce((prevValue, currImg) => prevValue + currImg.savedSize, 0)
      const imagesTotalSizeBefore = this.InputFileManager.getFilesTotalSize()

      this.state.allOperationsCompleted = allOperationsCompleted;
      this.state.uploading = false;
      this.uiManager.displayCurrentResultMessage("Udało się zaoszczędzić: ", formatFileSize(imagesTotalSizeBefore - imagesTotalSizeAfter))
      this.elements.downloadButton.removeAttribute("disabled");
      this.elements.clearButton.removeAttribute("disabled");

      Toast.show(Toast.SUCCESS, "Wszystkie obrazy zostały pomyślnie skompresowane!");
    }
  }  
}