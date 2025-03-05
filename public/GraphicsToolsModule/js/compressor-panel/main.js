'use strict';

import { GRAPHICS_TOOLS_MODULE } from '../utils/constants.js';
import CompressorPanel from './CompressorPanel.js';

document.addEventListener('DOMContentLoaded', async () => {
    const compressorElement = document.querySelector("#" + GRAPHICS_TOOLS_MODULE.COMPRESSOR_ID)
    //const size50MB = 50 * 1024 * 1024
    const {
        compressImagesURL
    } = JSON.parse(compressorElement.dataset.api)

    new CompressorPanel(compressorElement, {
        uploadUrl: compressImagesURL,
        // maxFileSize: size50MB,
        // allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
        // maxConcurrentUploads: 3,
        // maxBatchSize: 10, // Maksymalnie 10 plików w jednej partii
        // maxBatchSizeBytes: size50MB
    }); 

});  