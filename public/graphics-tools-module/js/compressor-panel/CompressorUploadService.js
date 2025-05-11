import UploadService from "../components/OperationPanel/UploadService.js";

export default class CompressorUploadService extends UploadService {
  constructor(config = {}, uiManager, fileManager) {
    super(config, uiManager, fileManager)
  }

  async uploadFile(file, { onProgress, onError, onComplete }) {
    onProgress(20); // FIXME: nie dokońca działa to jak trzeba ;/

    try {
      this.uploadingImages.push(file.name);

      const resizeOptions = this.config.getImageResize()
      const compressStrength = this.config.getCompressStrength() 
      const dataStep1 = await this.sendStepRequest({
        image: file,
        stepNumber: 1,
        options: JSON.stringify({ ...resizeOptions, strength: compressStrength })
        // options: {
        //   strength: compressStrength,
        //   isChange: resizeOptions.isChange,
        //   width: resizeOptions.width,
        //   height: resizeOptions.height,
        //   percent: resizeOptions.percent,
        //   changeBy: resizeOptions.changeBy
        // }
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