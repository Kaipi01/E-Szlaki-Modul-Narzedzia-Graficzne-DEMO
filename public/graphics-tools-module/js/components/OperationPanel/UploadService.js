'use strict';

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
   * @param {Object} options - Opcje konfiguracyjne
   * @param {string} options.uploadUrl - URL endpointu do przetworzenia obrazu
   * @param {number} options.maxConcurrentUploads - Maksymalna liczba równoczesnych wysyłek
   * @param {UIManager} uiManager
   * @param {InputFileManager} fileManager
   */
  constructor(options = {}, uiManager, fileManager) {
    this.config = options;
    this.uiManager = uiManager;
    this.fileManager = fileManager

    if (!this.config.uploadUrl) {
      console.error('UploadServiceError: upload url is undefined!');
    }

    this.uploadingImages = [];
  }

  /**
   * Wysyłanie pojedynczego pliku z monitorowaniem postępu 
   * @param {File} file - Plik do wysłania
   * @param {Object} callbacks
   * @param {Function} callbacks.onProgress - Callback wywoływany przy aktualizacji postępu
   * @param {Function} callbacks.onError - Callback wywoływany przy błędzie
   * @param {Function} callbacks.onComplete - Callback wywoływany po zakończeniu
   */
  async uploadFile(file, { onProgress, onError, onComplete }) {
    onProgress(20); // FIXME: nie dokońca działa to jak trzeba ;/

    const errorHandler = (errorMessage) => {
      onProgress(0);
      onError(errorMessage);
      console.error(errorMessage);
    };

    try {
      this.uploadingImages.push(file.name);

      const dataStep1 = await this.sendStepRequest({ image: file, stepNumber: 1 });
      const { processHash, progress } = dataStep1.processData;

      if (!processHash) {
        throw new Error('Otrzymano nie poprawne dane. Kod błędu: 500');
      }

      onProgress(progress);

      const dataStep2 = await this.sendStepRequest({ processHash, stepNumber: 2 });

      onProgress(dataStep2.processData.progress);

      const dataStep3 = await this.sendStepRequest({ processHash, stepNumber: 3 });

      onProgress(dataStep3.processData.progress);

      onComplete(processHash);
    } catch (error) {
      errorHandler(`Wystąpił błąd podczas operacji: ${error.message}`);
      console.error(error);
    }
  }

  /** @param {Object} data */
  async sendStepRequest(data) {
    const formData = new FormData();  

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        formData.append(key, data[key]);
      }
    }

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
