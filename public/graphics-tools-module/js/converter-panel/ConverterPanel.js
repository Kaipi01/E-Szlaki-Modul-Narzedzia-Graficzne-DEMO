"use strict";

import InputFileManager from "../components/OperationPanel/InputFileManager.js";
import OperationPanel from "../components/OperationPanel/OperationPanel.js";
import UIManager from "../components/OperationPanel/UIManager.js";
import UploadService from "../components/OperationPanel/UploadService.js";

/** Klasa ConverterPanel służąca do konwertowania obrazów */
export default class ConverterPanel extends OperationPanel {

  constructor(container, options = {}) {
    super(container, options);

    this.initComponents();
    this.initCompressorEvents()
  }

  initConverterEvents() {
    this.elements.downloadButton.addEventListener("click", () => this.handleDownloadAllImages('skonwertowane-grafiki'));
  }

  initComponents() {
    this.InputFileManager = new InputFileManager({
      ...this.options,
      onFileAdded: this.handleFileAdded.bind(this),
      onFileRemoved: this.handleFileRemove.bind(this),
      onError: this.showError.bind(this),
    });

    this.uiManager = new UIManager(this.elements, {
      ...this.options,
      onFileSelect: this.handleFileSelect.bind(this),
      onFileRemove: this.handleFileRemove.bind(this),
      onClear: this.handleClear.bind(this),
    });

    this.uploadService = new UploadService(this.options, this.uiManager, this.InputFileManager);
  }
}