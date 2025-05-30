'use strict';

import UploadService from "../../components/OperationPanel/UploadService.js";

export default class CompressorUploadService extends UploadService {
  constructor(config = {}, uiManager, fileManager) {
    super(config, uiManager, fileManager)
  }

  async uploadFile(file, { onProgress, onError, onComplete }) {
    onProgress(20); 

    try {
      this.uploadingImages.push(file.name);

      const resizeOptions = this.config.getImageResize()
      const compressQuality = this.config.getCompressQuality() 
      const dataStep1 = await this.sendStepRequest({
        image: file,
        stepNumber: 1,
        options: JSON.stringify({ ...resizeOptions, quality: compressQuality })
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
      onProgress(0);
      onError(error.message);
      console.error(error);
    }
  }
}