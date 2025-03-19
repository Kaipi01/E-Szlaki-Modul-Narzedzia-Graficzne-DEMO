import { GRAPHICS_TOOLS_MODULE } from '../utils/constants.js';
import CompressorPanel from './CompressorPanel.js';

document.addEventListener('DOMContentLoaded', async () => {
    const compressorElement = document.querySelector("#" + GRAPHICS_TOOLS_MODULE.COMPRESSOR_ID) 

    // stałe COMPRESS_IMAGES_URL i TRACK_COMPRESSION_PROGRESS_URL 
    // są zadeklarowane w graphics_tools_module/compressor_panel/index.html.twig
    
    new CompressorPanel(compressorElement, {
        uploadUrl: COMPRESS_IMAGES_URL, 
        trackProgressUrl: TRACK_COMPRESSION_PROGRESS_URL, 
        imageDataUrl: GET_IMAGE_DATA_URL, 
        maxBatchSize: GRAPHICS_TOOLS_MODULE.MAX_BATCH_SIZE,
        maxBatchSizeBytes: GRAPHICS_TOOLS_MODULE.MAX_BATCH_SIZE_BYTES, 
        maxConcurrentUploads: GRAPHICS_TOOLS_MODULE.MAX_CONCURRENT_UPLOADS,
        allowedTypes: GRAPHICS_TOOLS_MODULE.IMAGE_ALLOWED_TYPES,
        maxFileSize: GRAPHICS_TOOLS_MODULE.IMAGE_MAX_SIZE, 
    }); 

});