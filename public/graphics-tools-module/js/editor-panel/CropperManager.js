export default class CropperManager {
  /** 
   * @param {HTMLElement} cropperWrapper 
   * @param {HTMLImageElement} imagePreviewElement 
   */
  constructor(Cropper, cropperWrapper, imagePreviewElement) {
    this.Cropper = Cropper
    this.cropperWrapper = cropperWrapper
    this.imagePreviewElement = imagePreviewElement
    this.cropperInstance = null
  }

  getCropperInstance = () => this.cropperInstance

  
  /** @returns {Promise<HTMLCanvasElement>} */
  getCroppedCanvas = async () => this.cropperWrapper.querySelector('cropper-selection').$toCanvas();

  destroyCropper() {
    if (this.cropperInstance !== null) { 
        this.cropperWrapper.querySelector('cropper-canvas')?.remove() 
        this.cropperInstance = null
        this.imagePreviewElement.style.display = ""
    }
  }

  createCropper() {
    if (!this.Cropper) {
      throw new Error("Cropper nie jest załadowany!");
    }  

    this.destroyCropper()

    this.cropperInstance = new this.Cropper(this.imagePreviewElement, {
      viewMode: 0.2,
      // viewMode: 1,
      dragMode: 'move',
      aspectRatio: 16 / 9,
      // autoCropArea: 0.9,
      autoCropArea: 0.2,
      restore: true,
      modal: false,
      // modal: true,
      guides: true,
      center: true,
      // highlight: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
    }); 
  } 
}