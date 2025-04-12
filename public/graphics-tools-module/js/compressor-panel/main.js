import { GRAPHICS_TOOLS_MODULE } from '../utils/constants.js';
import CompressorPanel from './CompressorPanel.js';

document.addEventListener('DOMContentLoaded', async () => {
    const compressorElement = document.querySelector("#" + GRAPHICS_TOOLS_MODULE.COMPRESSOR_ID) 

    // stałe COMPRESS_IMAGES_URL, DOWNLOAD_ALL_IMAGES_URL i GET_IMAGE_DATA_URL
    // są zadeklarowana w graphics_tools_module/compressor_panel/index.html.twig
    /* eslint-disable no-undef */
    
    new CompressorPanel(compressorElement, {
        uploadUrl: COMPRESS_IMAGES_URL,
        downloadAllImagesUrl: DOWNLOAD_ALL_IMAGES_URL, 
        imageDataUrl: GET_IMAGE_DATA_URL, 
        maxBatchSize: GRAPHICS_TOOLS_MODULE.MAX_BATCH_SIZE,
        maxBatchSizeBytes: GRAPHICS_TOOLS_MODULE.MAX_BATCH_SIZE_BYTES, 
        maxConcurrentUploads: GRAPHICS_TOOLS_MODULE.MAX_CONCURRENT_UPLOADS,
        allowedTypes: GRAPHICS_TOOLS_MODULE.IMAGE_ALLOWED_TYPES,
        maxFileSize: GRAPHICS_TOOLS_MODULE.IMAGE_MAX_SIZE, 
    }); 

});