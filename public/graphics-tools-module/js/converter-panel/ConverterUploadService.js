import UploadService from "../components/OperationPanel/UploadService.js";

export default class ConverterUploadService extends UploadService {
  constructor(options = {}, uiManager, fileManager) {
    super(options, uiManager, fileManager) 
  }

  /** @override */
  async uploadFile(file, { onProgress, onError, onComplete }) {
    onProgress(20);

    const errorHandler = (errorMessage) => {
      onProgress(0);
      onError(errorMessage);
      console.error(errorMessage);
    };

    try {
      this.uploadingImages.push(file.name);

      const selectedFormat = this.config.getSelectedFormat()
      const selectedQuality = this.config.getSelectedQuality()
      const addCompressIsChecked = this.config.getAddCompressIsChecked()
      
      
      const dataStep1 = await this.sendStepRequest({
        image: file,
        stepNumber: 1,
        toFormat: selectedFormat,
        quality: selectedQuality,
        addCompress: addCompressIsChecked
      });
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
}