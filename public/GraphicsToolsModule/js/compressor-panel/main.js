'use strict';

import CompressorPanel from './CompressorPanel.js';

document.addEventListener('DOMContentLoaded', async () => {
    const compressorElement = document.querySelector("#graphics-tools-module-compressor")

    const {
        compressImagesURL
    } = JSON.parse(compressorElement.dataset.api)

    const compressorPanel = new CompressorPanel(compressorElement, {
        uploadUrl: compressImagesURL,
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
        maxConcurrentUploads: 3
    }); 

});