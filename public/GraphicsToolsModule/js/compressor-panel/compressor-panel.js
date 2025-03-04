'use strict';

import CompressorPanel from './CompressorPanel.js'; 

document.addEventListener('DOMContentLoaded', () => {
 

    new CompressorPanel("#graphics-tools-module-compressor", {
        uploadUrl: '/api/compress-images',
        maxFileSize: 15 * 1024 * 1024, // 15MB 
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
        maxConcurrentUploads: 3
    });


});


/**
     * Obsługa kompresji obrazów
     */
    // handleCompression() {
    //     if (this.state.files.length === 0 || this.state.uploading) return;

    //     this.state.uploading = true;
    //     this.updateUI();

    //     // Pokazanie paska postępu
    //     this.elements.progressContainer.style.display = 'block';
    //     this.elements.progressBar.style.width = '0%';
    //     this.elements.progressText.textContent = '0%';

    //     // Przygotowanie danych do wysłania
    //     const formData = this.prepareFormData();

    //     // Wysłanie danych na serwer
    //     this.uploadImages(formData);
    // }