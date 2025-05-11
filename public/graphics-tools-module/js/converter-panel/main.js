import ThemeSwitcher from "../modules/ThemeSwitcher.js"
import { GRAPHICS_TOOLS_MODULE } from '../utils/constants.js';
import ConverterPanel from './ConverterPanel.js';

document.addEventListener('DOMContentLoaded', async () => {
  const { CONVERTER_ID, MAX_BATCH_SIZE, MAX_BATCH_SIZE_BYTES, MAX_CONCURRENT_UPLOADS, IMAGE_ALLOWED_TYPES, IMAGE_MAX_SIZE } = GRAPHICS_TOOLS_MODULE
  const converterElement = document.querySelector("#" + CONVERTER_ID)

  new ConverterPanel(converterElement, {
    uploadUrl: CONVERT_IMAGES_URL,
    downloadAllImagesUrl: DOWNLOAD_ALL_IMAGES_URL,
    imageDataUrl: GET_IMAGE_DATA_URL,
    maxBatchSize: MAX_BATCH_SIZE,
    maxBatchSizeBytes: MAX_BATCH_SIZE_BYTES,
    maxConcurrentUploads: MAX_CONCURRENT_UPLOADS,
    allowedTypes: IMAGE_ALLOWED_TYPES,
    maxFileSize: IMAGE_MAX_SIZE,
  });
  
});