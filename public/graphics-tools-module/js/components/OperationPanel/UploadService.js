'use strict';

import objectToFormData from "../../utils/objectToFormData.js";
import InputFileManager from "../InputFileManager.js";
import UIManager from "./UIManager.js";


/**
 * Klasa UploadService jest odpowiedzialna za:
 * - Wysyłanie plików na serwer
 * - Śledzenie postępu wysyłania
 * - Obsługę odpowiedzi z serwera
 * - Monitorowanie postępu operacji
 */
export default class UploadService {
  /**
   * @param {Object} config - Opcje konfiguracyjne
   * @param {string} config.uploadUrl - URL endpointu do przetworzenia obrazu
   * @param {number} config.maxConcurrentUploads - Maksymalna liczba równoczesnych wysyłek
   * @param {UIManager} uiManager
   * @param {InputFileManager} fileManager
   */
  constructor(config = {}, uiManager, fileManager) {
    this.config = config;
    this.uiManager = uiManager;
    this.fileManager = fileManager

    if (!this.config.uploadUrl) {
      console.error('UploadServiceError: upload url is undefined!');
    }

    this.uploadingImages = [];
  }

  /**
   * Wysyłanie pojedynczego pliku z monitorowaniem postępu 
   * @abstract
   * @param {File} file - Plik do wysłania
   * @param {Object} callbacks
   * @param {Function} callbacks.onProgress - Callback wywoływany przy aktualizacji postępu
   * @param {Function} callbacks.onError - Callback wywoływany przy błędzie
   * @param {Function} callbacks.onComplete - Callback wywoływany po zakończeniu
   */
  async uploadFile(file, { onProgress, onError, onComplete }) {}

  /** @param {Object} data */
  async sendStepRequest(data = {}) {
    const formData = objectToFormData(data);  
    const response = await fetch(this.config.uploadUrl, { method: 'POST', body: formData });
    const responseData = await response.json(); 

    if (!responseData.success) {
      throw new Error(responseData.errorMessage);
    }

    return responseData;
  }

  /** Anulowanie wszystkich aktywnych wysyłek */
  cancelAllUploads() {
    this.uploadingImages = [] 

    this.fileManager.clearFiles()
    this.uiManager.displayCurrentResultMessage("Udało się zaoszczędzić: ", "0 KB")
  }

  /** @param {string} fileName */
  cancelUpload(fileName) { 

    this.fileManager.removeFile(fileName)

    const index = this.uploadingImages.indexOf(fileName);

    if (index !== -1) {
      this.uploadingImages.splice(index, 1);
    }

    if (this.uploadingImages.length === 0) {
      this.uiManager.displayCurrentResultMessage("Udało się zaoszczędzić: ", "0 KB")
    } 
  }
}
