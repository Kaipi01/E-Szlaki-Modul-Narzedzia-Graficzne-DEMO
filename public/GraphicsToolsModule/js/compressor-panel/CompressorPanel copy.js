'use strict';

import AbstractPanel from '../modules/AbstractPanel.js';
import Toast from '../modules/Toast.js';

/**
 * Klasa CompressorPanel służąca do kompresji obrazów 
 * 
 * Odpowiedzialna za:
 * - Wczytywanie obrazów przez input file lub drag & drop
 * - Wyświetlanie miniatur obrazów
 * - Wysyłanie obrazów na serwer do kompresji
 */
export default class CompressorPanel extends AbstractPanel {
    /**
     * Konstruktor klasy CompressorPanel
     * @param {HTMLElement | string} container 
     * @param {Object} options - Opcje konfiguracyjne
     * @param {string} options.uploadUrl - URL endpointu do kompresji obrazów
     * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
     * @param {Array} options.allowedTypes - Dozwolone typy plików
     * @param {number} options.maxConcurrentUploads - Maksymalna liczba równoczesnych wysyłek
     * @param {number} options.maxBatchSize - Maksymalna liczba plików w jednej partii (domyślnie 10)
     * @param {number} options.maxBatchSizeBytes - Maksymalny rozmiar partii w bajtach (domyślnie 50MB)
     */
    constructor(container, options = {}) {
        super(container)

        this.config = {
            uploadUrl: options.uploadUrl || '/api/compress-images',
            maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
            allowedTypes: options.allowedTypes || ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
            maxConcurrentUploads: options.maxConcurrentUploads || 3,
            maxBatchSize: options.maxBatchSize || 10, // Maksymalnie 10 plików w jednej partii
            maxBatchSizeBytes: options.maxBatchSizeBytes || 50 * 1024 * 1024 // Maksymalnie 50MB w jednej partii
        };

        // Stan aplikacji
        this.state = {
            files: [], // Przechowuje obiekty plików
            uploading: false,
            uploadQueue: [], // Kolejka plików lub partii do wysłania
            activeUploads: 0, // Aktualnie aktywne wysyłania
            totalProgress: {}, // Postęp dla każdego pliku
            uploadStrategy: 'batch' // 'batch' lub 'single'
        };

        // Inicjalizacja elementów DOM
        this.initElements();

        // Inicjalizacja nasłuchiwania zdarzeń
        this.attachEventListeners();
    }

    /**
     * Przygotowanie danych formularza do wysłania
     * Metoda zmodyfikowana do obsługi pojedynczych plików
     */
    prepareFileFormData(file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('filename', file.name);
        return formData;
    }


    /**
     * Inicjalizacja referencji do elementów DOM
     */
    initElements() {
        this.elements = {
            dropZone: this.getByAttribute('data-drop-zone'),
            fileInput: this.getByAttribute('data-file-input'),
            selectButton: this.getByAttribute('data-select-button'),
            imageGallery: this.getByAttribute('data-image-gallery'),
            compressButton: this.getByAttribute('data-compress-button'),
            clearButton: this.getByAttribute('data-clear-button'),
            progressContainer: this.getByAttribute('data-progress-container'),
            progressBar: this.getByAttribute('data-progress-bar'),
            progressText: this.getByAttribute('data-progress-text'),
            compressorAlerts: this.getByAttribute('data-compressor-alerts')
        };
    }

    /**
     * Podpięcie nasłuchiwania zdarzeń
     */
    attachEventListeners() {
        // Obsługa wyboru plików przez input
        this.elements.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Obsługa przycisku wyboru plików
        this.elements.selectButton.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // Obsługa drag & drop
        this.elements.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.elements.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.elements.dropZone.addEventListener('drop', this.handleDrop.bind(this));

        // Obsługa przycisków akcji
        this.elements.compressButton.addEventListener('click', this.handleCompression.bind(this));
        this.elements.clearButton.addEventListener('click', this.clearGallery.bind(this));

        // Zapobieganie domyślnej akcji przeglądarki przy upuszczaniu plików 
        document.addEventListener('dragover', this.preventBrowserDefaults.bind(this));
        document.addEventListener('drop', this.preventBrowserDefaults.bind(this));
    }

    /**
     * Zapobiega domyślnym akcjom przeglądarki
     */
    preventBrowserDefaults(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * Obsługa zdarzenia przeciągania plików nad obszarem drop zone
     */
    handleDragOver(event) {
        this.preventBrowserDefaults(event);
        this.elements.dropZone.classList.add('drag-over');
    }

    /**
     * Obsługa zdarzenia opuszczenia obszaru drop zone podczas przeciągania
     */
    handleDragLeave(event) {
        this.preventBrowserDefaults(event);
        this.elements.dropZone.classList.remove('drag-over');
    }

    /**
     * Obsługa zdarzenia upuszczenia plików w obszarze drop zone
     */
    handleDrop(event) {
        this.preventBrowserDefaults(event);
        this.elements.dropZone.classList.remove('drag-over');

        const droppedFiles = event.dataTransfer.files;
        this.processFiles(droppedFiles);
    }

    /**
     * Obsługa zdarzenia wyboru plików przez input
     */
    handleFileSelect(event) {
        const selectedFiles = event.target.files;
        this.processFiles(selectedFiles);
    }

    /**
     * Przetwarzanie wybranych plików
     */
    processFiles(fileList) {
        if (!fileList || fileList.length === 0) return;

        const newFiles = Array.from(fileList).filter(file => {
            // Sprawdzenie czy plik jest obrazem o dozwolonym typie
            if (!this.config.allowedTypes.includes(file.type)) {
                const allowedTypesList = this.config.allowedTypes.map(format => {
                    return format.replace('image/', '').toUpperCase()
                })

                this.showError(`Plik "${file.name}" ma niedozwolony format. Dozwolone formaty: ${allowedTypesList.join(', ')}.`);
                return false;
            }

            // Sprawdzenie rozmiaru pliku
            if (file.size > this.config.maxFileSize) {
                this.showError(`Plik "${file.name}" jest zbyt duży. Maksymalny rozmiar pliku to ${this.config.maxFileSize / (1024 * 1024)}MB.`);
                return false;
            }

            // Sprawdzenie czy plik nie został już dodany
            const isDuplicate = this.state.files.some(existingFile =>
                existingFile.name === file.name &&
                existingFile.size === file.size &&
                existingFile.lastModified === file.lastModified
            );

            if (isDuplicate) {
                this.showError(`Plik "${file.name}" został już dodany.`);
                return false;
            }

            return true;
        });

        if (newFiles.length === 0) return;

        // Dodanie nowych plików do stanu aplikacji
        this.state.files = [...this.state.files, ...newFiles];

        // Renderowanie miniatur
        newFiles.forEach(file => this.renderThumbnail(file));

        // Aktualizacja UI
        this.updateUI();

        // Resetowanie input file, aby umożliwić ponowne wybranie tych samych plików
        this.elements.fileInput.value = '';
    }


    /** @param {string} message */
    showError(message) {
        super.showError(message, this.elements.compressorAlerts)
    }

    /**
     * Usuwanie pliku z galerii
     */
    removeFile(fileName) {
        // Usunięcie pliku ze stanu
        this.state.files = this.state.files.filter(file => file.name !== fileName);

        // Usunięcie miniatury z DOM
        const thumbnailToRemove = this.elements.imageGallery.querySelector(`[data-file-name="${fileName}"]`);
        if (thumbnailToRemove) {
            this.elements.imageGallery.removeChild(thumbnailToRemove);
        }

        // Aktualizacja UI
        this.updateUI();
    }

    /**
     * Aktualizacja interfejsu użytkownika
     */
    updateUI() {
        const hasFiles = this.state.files.length > 0;

        // Aktualizacja przycisków
        this.elements.compressButton.disabled = !hasFiles || this.state.uploading;
        this.elements.clearButton.disabled = !hasFiles || this.state.uploading;

        // Aktualizacja klasy dla obszaru drop zone
        if (hasFiles) {
            this.elements.dropZone.classList.add('has-files');
        } else {
            this.elements.dropZone.classList.remove('has-files');
        }
    }



    /**
     * Czyszczenie galerii
     */
    clearGallery() {
        if (this.state.uploading) return;

        // Wyczyszczenie stanu
        this.state.files = [];

        // Wyczyszczenie galerii
        this.elements.imageGallery.innerHTML = '';

        // Aktualizacja UI
        this.updateUI();
    }

    /**
     * Wyświetlenie komunikatu o sukcesie
     */
    showSuccess(message) {
        Toast.show(Toast.SUCCESS, message);
    }

    /**
     * Formatowanie rozmiaru pliku do czytelnej postaci
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Renderowanie miniatury obrazu w widoku listy
     */
    renderThumbnail(file) {
        const reader = new FileReader();

        reader.onload = (event) => {
            const listItem = document.createElement('div');
            listItem.className = 'image-compressor__list-item';
            listItem.dataset.fileName = file.name;

            // Komórka z miniaturą
            const previewCell = document.createElement('div');
            previewCell.className = 'image-compressor__list-cell image-compressor__list-cell--preview';

            const img = document.createElement('img');
            img.className = 'image-compressor__preview-image';
            img.src = event.target.result;
            img.alt = file.name;

            previewCell.appendChild(img);

            // Komórka z nazwą pliku
            const nameCell = document.createElement('div');
            nameCell.className = 'image-compressor__list-cell image-compressor__list-cell--name';

            const nameText = document.createElement('p');
            nameText.className = 'image-compressor__item-name';
            nameText.textContent = file.name;

            nameCell.appendChild(nameText);

            // Komórka z typem pliku
            const typeCell = document.createElement('div');
            typeCell.className = 'image-compressor__list-cell image-compressor__list-cell--type';
            typeCell.innerHTML = `<span class="image-compressor__item-type">${file.type}</span>`;

            // Komórka z rozmiarem pliku
            const sizeCell = document.createElement('div');
            sizeCell.className = 'image-compressor__list-cell image-compressor__list-cell--size';
            sizeCell.innerHTML = `<span class="image-compressor__item-size">${this.formatFileSize(file.size)}</span>`;

            // Komórka z rozmiarem po kompresji (początkowo pusta)
            const compressedSizeCell = document.createElement('div');
            compressedSizeCell.className = 'image-compressor__list-cell image-compressor__list-cell--compressed-size';
            compressedSizeCell.innerHTML = '<span class="image-compressor__item-compressed-size">-</span>';

            // Komórka z współczynnikiem kompresji (początkowo pusta)
            const ratioCell = document.createElement('div');
            ratioCell.className = 'image-compressor__list-cell image-compressor__list-cell--ratio';
            ratioCell.innerHTML = '<span class="image-compressor__compression-ratio">-</span>';

            // Komórka z przyciskiem usuwania
            const actionsCell = document.createElement('div');
            actionsCell.className = 'image-compressor__list-cell image-compressor__list-cell--actions';

            const removeButton = document.createElement('button');
            removeButton.className = 'image-compressor__item-remove';
            removeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
            removeButton.addEventListener('click', () => this.removeFile(file.name));
            removeButton.title = "Usuń plik";

            actionsCell.appendChild(removeButton);

            // Dodanie wszystkich komórek do wiersza
            listItem.appendChild(previewCell);
            listItem.appendChild(nameCell);
            listItem.appendChild(typeCell);
            listItem.appendChild(sizeCell);
            listItem.appendChild(compressedSizeCell);
            listItem.appendChild(ratioCell);
            listItem.appendChild(actionsCell);

            // Dodanie wiersza do listy
            this.elements.imageGallery.appendChild(listItem);
        };

        reader.onerror = () => {
            this.showError(`Błąd podczas wczytywania pliku "${file.name}".`);
        };

        reader.readAsDataURL(file);
    }






    /**
     * Obsługa kompresji obrazów
     */
    handleCompression() {
        if (this.state.files.length === 0 || this.state.uploading) return;

        this.state.uploading = true;
        this.updateUI();

        // Pokazanie paska postępu
        this.elements.progressContainer.style.display = 'block';
        this.elements.progressBar.style.width = '0%';
        this.elements.progressText.textContent = '0%';

        // Określenie strategii wysyłania
        this.determineUploadStrategy();

        // Inicjalizacja postępu dla każdego pliku
        this.state.totalProgress = {};
        this.state.files.forEach(file => {
            this.state.totalProgress[file.name] = 0;
        });

        // Rozpoczęcie procesu wysyłania zgodnie z wybraną strategią
        if (this.state.uploadStrategy === 'batch') {
            this.uploadAllFiles();
        } else {
            this.prepareUploadQueue();
            this.processUploadQueue();
        }
    }

    /**
     * Określa strategię wysyłania na podstawie liczby i rozmiaru plików
     */
    determineUploadStrategy() {
        const totalFiles = this.state.files.length;
        const totalSize = this.state.files.reduce((sum, file) => sum + file.size, 0);

        // Jeśli liczba plików jest mała i łączny rozmiar nie przekracza limitu, używamy wysyłania wsadowego
        if (totalFiles <= this.config.maxBatchSize && totalSize <= this.config.maxBatchSizeBytes) {
            this.state.uploadStrategy = 'batch';
            console.log('Wybrano strategię: batch upload');
        } else {
            this.state.uploadStrategy = 'queue';
            console.log('Wybrano strategię: queue upload');
        }
    }

    /**
     * Przygotowuje kolejkę wysyłania, dzieląc pliki na partie
     */
    prepareUploadQueue() {
        // Reset kolejki
        this.state.uploadQueue = [];
        this.state.activeUploads = 0;

        // Tworzymy kopię tablicy plików do podziału na partie
        const filesToUpload = [...this.state.files];

        // Dzielimy pliki na partie
        while (filesToUpload.length > 0) {
            let currentBatchSize = 0;
            const batch = [];

            // Dodajemy pliki do partii, dopóki nie przekroczymy limitów
            while (filesToUpload.length > 0 &&
                batch.length < this.config.maxBatchSize &&
                currentBatchSize + filesToUpload[0].size <= this.config.maxBatchSizeBytes) {
                const file = filesToUpload.shift();
                batch.push(file);
                currentBatchSize += file.size;
            }

            // Jeśli batch zawiera tylko jeden plik, dodajemy go jako pojedynczy plik
            if (batch.length === 1) {
                this.state.uploadQueue.push({
                    type: 'single',
                    file: batch[0]
                });
            } else {
                this.state.uploadQueue.push({
                    type: 'batch',
                    files: batch
                });
            }
        }

        console.log(`Przygotowano ${this.state.uploadQueue.length} partii do wysłania`);
    }

    /**
     * Przetwarzanie kolejki wysyłania
     */
    processUploadQueue() {
        // Jeśli kolejka jest pusta, zakończ proces
        if (this.state.uploadQueue.length === 0 && this.state.activeUploads === 0) {
            this.finishUpload();
            return;
        }

        // Dopóki można rozpocząć nowe wysyłanie, rozpocznij je
        while (this.state.activeUploads < this.config.maxConcurrentUploads && this.state.uploadQueue.length > 0) {
            const item = this.state.uploadQueue.shift();
            this.state.activeUploads++;

            if (item.type === 'single') {
                this.uploadSingleFile(item.file);
            } else {
                this.uploadFileBatch(item.files);
            }
        }
    }

    /**
     * Wysyłanie pojedynczego pliku
     * @param {File} file - Plik do wysłania
     */
    uploadSingleFile(file) {
        const formData = this.prepareFileFormData(file);
        const xhr = new XMLHttpRequest();

        // Obsługa postępu wysyłania
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const filePercentComplete = Math.round((event.loaded / event.total) * 100);

                // Aktualizacja postępu dla tego pliku
                this.state.totalProgress[file.name] = filePercentComplete;

                // Obliczenie łącznego postępu
                this.updateTotalProgress();
            }
        });

        // Obsługa zakończenia wysyłania
        xhr.addEventListener('load', () => {
            // Zmniejszenie licznika aktywnych wysyłań
            this.state.activeUploads--;

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    // Obsługa odpowiedzi dla pojedynczego pliku
                    if (response.compressedImages && Array.isArray(response.compressedImages)) {
                        // Znajdź informacje o tym pliku
                        const fileInfo = response.compressedImages.find(img => img.originalName === file.name);
                        if (fileInfo) {
                            this.updateCompressedImageInfo(
                                fileInfo.originalName,
                                fileInfo.compressedSize,
                                fileInfo.compressionRatio
                            );
                        }
                    }
                    console.log(`Plik ${file.name} został pomyślnie wysłany.`);
                } catch (error) {
                    this.showError(`Błąd podczas przetwarzania odpowiedzi dla pliku "${file.name}".`);
                }
            } else {
                this.showError(`Błąd serwera dla pliku "${file.name}": ${xhr.status} ${xhr.statusText}`);
            }

            // Kontynuuj przetwarzanie kolejki
            this.processUploadQueue();
        });

        // Obsługa błędu wysyłania
        xhr.addEventListener('error', () => {
            this.showError(`Błąd połączenia podczas wysyłania pliku "${file.name}".`);
            this.state.activeUploads--;
            this.processUploadQueue();
        });

        // Obsługa przerwania wysyłania
        xhr.addEventListener('abort', () => {
            this.showError(`Wysyłanie pliku "${file.name}" zostało przerwane.`);
            this.state.activeUploads--;
            this.processUploadQueue();
        });

        // Wysłanie żądania
        xhr.open('POST', this.config.uploadUrl);
        xhr.send(formData);
    }

    /**
     * Wysyłanie partii plików
     * @param {Array<File>} files - Tablica plików do wysłania
     */
    uploadFileBatch(files) {
        const formData = this.prepareBatchFormData(files);
        const xhr = new XMLHttpRequest();

        // Łączny rozmiar partii do obliczenia postępu
        const totalBatchSize = files.reduce((sum, file) => sum + file.size, 0);

        // Nazwy plików w partii
        const fileNames = files.map(file => file.name);

        // Obsługa postępu wysyłania
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const batchPercentComplete = Math.round((event.loaded / event.total) * 100);

                // Aktualizacja postępu dla wszystkich plików w partii
                fileNames.forEach(fileName => {
                    this.state.totalProgress[fileName] = batchPercentComplete;
                });

                // Obliczenie łącznego postępu
                this.updateTotalProgress();
            }
        });

        // Obsługa zakończenia wysyłania
        xhr.addEventListener('load', () => {
            // Zmniejszenie licznika aktywnych wysyłań
            this.state.activeUploads--;

            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);

                    // Obsługa odpowiedzi dla partii plików
                    if (response.compressedImages && Array.isArray(response.compressedImages)) {
                        response.compressedImages.forEach(image => {
                            this.updateCompressedImageInfo(
                                image.originalName,
                                image.compressedSize,
                                image.compressionRatio
                            );
                        });
                    }

                    console.log(`Partia ${fileNames.length} plików została pomyślnie wysłana.`);
                } catch (error) {
                    this.showError(`Błąd podczas przetwarzania odpowiedzi dla partii plików.`);
                }
            } else {
                this.showError(`Błąd serwera dla partii plików: ${xhr.status} ${xhr.statusText}`);
            }

            // Kontynuuj przetwarzanie kolejki
            this.processUploadQueue();
        });

        // Obsługa błędu wysyłania
        xhr.addEventListener('error', () => {
            this.showError(`Błąd połączenia podczas wysyłania partii plików.`);
            this.state.activeUploads--;
            this.processUploadQueue();
        });

        // Obsługa przerwania wysyłania
        xhr.addEventListener('abort', () => {
            this.showError(`Wysyłanie partii plików zostało przerwane.`);
            this.state.activeUploads--;
            this.processUploadQueue();
        });

        // Wysłanie żądania
        xhr.open('POST', this.config.uploadUrl);
        xhr.send(formData);
    }

    /**
     * Wysyłanie wszystkich plików jednocześnie
     */
    uploadAllFiles() {
        const formData = this.prepareBatchFormData(this.state.files);
        const xhr = new XMLHttpRequest();

        // Obsługa postępu wysyłania
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);

                // Aktualizacja postępu dla wszystkich plików
                this.state.files.forEach(file => {
                    this.state.totalProgress[file.name] = percentComplete;
                });

                this.updateProgress(percentComplete);
            }
        });

        // Obsługa zakończenia wysyłania
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    this.handleSuccessResponse(response);
                } catch (error) {
                    this.showError('Błąd podczas przetwarzania odpowiedzi serwera');
                }
            } else {
                this.showError(`Błąd serwera: ${xhr.status} ${xhr.statusText}`);
            }

            this.finishUpload();
        });

        // Obsługa błędu wysyłania
        xhr.addEventListener('error', () => {
            this.showError('Błąd połączenia z serwerem.');
            this.finishUpload();
        });

        // Obsługa przerwania wysyłania
        xhr.addEventListener('abort', () => {
            this.showError('Wysyłanie zostało przerwane.');
            this.finishUpload();
        });

        // Wysłanie żądania
        xhr.open('POST', this.config.uploadUrl);
        xhr.send(formData);
    }

    /**
     * Przygotowanie danych formularza dla pojedynczego pliku
     * @param {File} file - Plik do wysłania
     * @returns {FormData} - Obiekt FormData z danymi pliku
     */
    prepareFileFormData(file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('filename', file.name);
        return formData;
    }

    /**
     * Przygotowanie danych formularza dla partii plików
     * @param {Array<File>} files - Tablica plików do wysłania
     * @returns {FormData} - Obiekt FormData z danymi plików
     */
    prepareBatchFormData(files) {
        const formData = new FormData();

        // Dodanie plików do formData
        files.forEach((file, index) => {
            formData.append(`image_${index}`, file);
        });

        // Dodanie liczby plików
        formData.append('count', files.length);

        return formData;
    }

    /**
     * Aktualizacja łącznego postępu wysyłania
     */
    updateTotalProgress() {
        const fileNames = Object.keys(this.state.totalProgress);
        if (fileNames.length === 0) return;

        // Obliczenie średniego postępu wszystkich plików
        const totalProgress = fileNames.reduce((sum, fileName) => {
            return sum + this.state.totalProgress[fileName];
        }, 0) / fileNames.length;

        // Aktualizacja paska postępu
        this.updateProgress(Math.round(totalProgress));
    }

    /**
     * Aktualizacja paska postępu
     * @param {number} percent - Procent postępu (0-100)
     */
    updateProgress(percent) {
        this.elements.progressBar.style.width = `${percent}%`;
        this.elements.progressText.textContent = `${percent}%`;
    }

    /**
     * Obsługa odpowiedzi z serwera po zakończeniu wszystkich wysyłek
     */
    finishUpload() {
        // Wyświetlenie komunikatu o sukcesie
        this.showSuccess('Wszystkie obrazy zostały pomyślnie skompresowane!');

        // Reset stanu
        this.state.uploading = false;
        this.state.activeUploads = 0;
        this.state.uploadQueue = [];
        this.state.totalProgress = {};

        this.updateUI();

        // Ukrycie paska postępu po krótkim opóźnieniu
        setTimeout(() => {
            this.elements.progressContainer.style.display = 'none';
        }, 1000);
    }

    /**
     * Obsługa udanej odpowiedzi serwera
     * @param {Object} response - Odpowiedź z serwera
     */
    handleSuccessResponse(response) {
        const {
            compressedImages
        } = response;

        // Wyświetlenie komunikatu o sukcesie
        this.showSuccess('Obrazy zostały pomyślnie skompresowane!');

        // Jeśli serwer zwraca linki do skompresowanych obrazów, aktualizujemy informacje w widoku listy
        if (compressedImages && Array.isArray(compressedImages)) {
            compressedImages.forEach(image => {
                this.updateCompressedImageInfo(
                    image.originalName,
                    image.compressedSize,
                    image.compressionRatio
                );
            });
        }
    }

    /**
     * Aktualizacja informacji o skompresowanym obrazie w widoku listy
     * @param {string} fileName - Nazwa pliku
     * @param {number} compressedSize - Rozmiar po kompresji w bajtach
     * @param {number} ratio - Współczynnik kompresji w procentach
     */
    updateCompressedImageInfo(fileName, compressedSize, ratio) {
        if (!fileName || typeof compressedSize !== 'number' || typeof ratio !== 'number') {
            console.warn('Nieprawidłowe parametry w updateCompressedImageInfo', {
                fileName,
                compressedSize,
                ratio
            });
            return;
        }

        const listItem = this.elements.imageGallery.querySelector(`[data-file-name="${fileName}"]`);
        if (!listItem) return;

        // Aktualizacja rozmiaru po kompresji
        const compressedSizeCell = listItem.querySelector('.image-compressor__list-cell--compressed-size');
        if (compressedSizeCell) {
            compressedSizeCell.innerHTML = `<span class="image-compressor__item-compressed-size">${this.formatFileSize(compressedSize)}</span>`;
        }

        // Aktualizacja współczynnika kompresji
        const ratioCell = listItem.querySelector('.image-compressor__list-cell--ratio');
        if (ratioCell) {
            ratioCell.innerHTML = `<span class="image-compressor__compression-ratio">${ratio}%</span>`;
        }
    }
} 


// Okej wygląda dobrze, ale to zbyt skomplikuje moim zdaniem kod. A zależy mi również na prostocie.
// Moja propozycja jest taka:

// CompressorPanel (główna klasa koordynująca)
// UICompressorManager (zarządzanie interfejsem, miniatury, wskaźniki postępu itd)
// FileManager (zarządzanie plikami)
// UploadService (serwis wysyłania i zarządzania)