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
     */
    constructor(container, options = {}) {
        super(container) 
        this.config = options;

        // Stan aplikacji
        this.state = {
            files: [], // Przechowuje obiekty plików
            uploading: false, 
            uploadQueue: [], // Kolejka plików do wysłania
            activeUploads: 0, // Aktualnie aktywne wysyłania
            totalProgress: {} // Postęp dla każdego pliku
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

        // Inicjalizacja kolejki i postępu
        this.state.uploadQueue = [...this.state.files];
        this.state.activeUploads = 0;
        this.state.totalProgress = {};

        // Inicjalizacja postępu dla każdego pliku
        this.state.files.forEach(file => {
            this.state.totalProgress[file.name] = 0;
        });

        // Rozpoczęcie procesu wysyłania
        this.processUploadQueue();
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
            const file = this.state.uploadQueue.shift();
            this.state.activeUploads++;
            this.uploadSingleFile(file);
        }
    }

    /**
     * Wysyłanie pojedynczego pliku
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
                    // Możesz tutaj obsłużyć odpowiedź dla pojedynczego pliku
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
                    return format.replace('image/' , '').toUpperCase()
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

    /**
     * Renderowanie miniatury obrazu
     */
    renderThumbnail(file) {
        const reader = new FileReader(); 

        reader.onload = (event) => {
            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'image-compressor__thumbnail-container';
            thumbnailContainer.dataset.fileName = file.name;

            const img = document.createElement('img');
            img.className = 'image-compressor__thumbnail';
            img.src = event.target.result;
            img.alt = file.name;

            const info = document.createElement('div');
            info.className = 'image-compressor__thumbnail-info';
            info.textContent = this.formatFileSize(file.size);

            const removeButton = document.createElement('div');
            removeButton.className = 'image-compressor__thumbnail-remove';
            removeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
            removeButton.addEventListener('click', () => this.removeFile(file.name));

            thumbnailContainer.appendChild(img);
            thumbnailContainer.appendChild(info);
            thumbnailContainer.appendChild(removeButton);

            this.elements.imageGallery.appendChild(thumbnailContainer);
        };

        reader.onerror = () => {
            this.showError(`Błąd podczas wczytywania pliku "${file.name}".`);
        };

        reader.readAsDataURL(file);
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
     * Przygotowanie danych formularza do wysłania
     */
    prepareFormData() {
        const formData = new FormData();

        // Dodanie plików do formData
        this.state.files.forEach((file, index) => {
            formData.append(`image_${index}`, file);
        });

        // Można dodać dodatkowe parametry, np. poziom kompresji
        formData.append('count', this.state.files.length);

        return formData;
    }

    /**
     * Wysłanie obrazów na serwer
     */
    uploadImages(formData) {
        const xhr = new XMLHttpRequest(); 

        // Obsługa postępu wysyłania
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
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
     * Aktualizacja paska postępu
     */
    updateProgress(percent) {
        this.elements.progressBar.style.width = `${percent}%`;
        this.elements.progressText.textContent = `${percent}%`;
    }

    /**
     * Obsługa udanej odpowiedzi serwera
     */
    handleSuccessResponse(response) {
        // Wyświetlenie toastu z informacją o sukcesie
        this.showSuccess('Obrazy zostały pomyślnie skompresowane!');

        // Jeśli serwer zwraca linki do skompresowanych obrazów, można je wyświetlić
        if (response.compressedImages && Array.isArray(response.compressedImages)) {
            // Implementacja wyświetlania skompresowanych obrazów
            // ...
        }
    }

    /**
     * Zakończenie procesu wysyłania
     */
    finishUpload() {
        this.state.uploading = false;
        this.updateUI();

        // Ukrycie paska postępu po krótkim opóźnieniu
        setTimeout(() => {
            this.elements.progressContainer.style.display = 'none';
        }, 1000);
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
}