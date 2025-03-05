import { formatFileSize } from "../utils/file-helpers.js";

/**
 * Klasa UICompressorManager
 * 
 * Odpowiedzialna za:
 * - Zarządzanie interfejsem użytkownika kompresora
 * - Renderowanie miniatur obrazów
 * - Aktualizację wskaźników postępu
 * - Obsługę interakcji użytkownika z interfejsem
 */
export default class UICompressorManager {
    /**
     * Konstruktor klasy UICompressorManager
     * @param {Object} elements - Referencje do elementów DOM
     * @param {HTMLElement} elements.dropZone - Element strefy upuszczania plików
     * @param {HTMLInputElement} elements.fileInput - Input typu file
     * @param {HTMLElement} elements.selectButton - Przycisk wyboru plików
     * @param {HTMLElement} elements.imageGallery - Kontener galerii obrazów
     * @param {HTMLButtonElement} elements.compressButton - Przycisk kompresji
     * @param {HTMLButtonElement} elements.clearButton - Przycisk czyszczenia
     * @param {HTMLElement} elements.progressContainer - Kontener paska postępu
     * @param {HTMLElement} elements.progressBar - Pasek postępu
     * @param {HTMLElement} elements.progressText - Tekst postępu
     * @param {HTMLElement} elements.compressorAlerts - Kontener alertów
     * @param {Object} options - Opcje konfiguracyjne
     * @param {Function} options.onFileSelect - Callback wywoływany po wyborze plików
     * @param {Function} options.onFileRemove - Callback wywoływany po usunięciu pliku
     * @param {Function} options.onCompress - Callback wywoływany po kliknięciu przycisku kompresji
     * @param {Function} options.onClear - Callback wywoływany po kliknięciu przycisku czyszczenia
     */
    constructor(elements, options = {}) {
        this.elements = elements;

        // Callbacki
        this.onFileSelect = options.onFileSelect || (() => {});
        this.onFileRemove = options.onFileRemove || (() => {});
        this.onCompress = options.onCompress || (() => {});
        this.onClear = options.onClear || (() => {});

        // Inicjalizacja nasłuchiwania zdarzeń
        this.attachEventListeners();
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
        this.elements.compressButton.addEventListener('click', () => this.onCompress());
        this.elements.clearButton.addEventListener('click', () => this.onClear());

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
        this.onFileSelect(droppedFiles);
    }

    /**
     * Obsługa zdarzenia wyboru plików przez input
     */
    handleFileSelect(event) {
        const selectedFiles = event.target.files;
        this.onFileSelect(selectedFiles);

        // Resetowanie input file, aby umożliwić ponowne wybranie tych samych plików
        this.elements.fileInput.value = '';
    }

    /**
     * Renderowanie miniatury obrazu w widoku listy
     * @param {File} file - Plik obrazu do wyświetlenia
     * @param {string} formattedSize - Sformatowany rozmiar pliku
     */
    renderThumbnail(file, formattedSize) {
        return new Promise((resolve, reject) => {
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
                sizeCell.innerHTML = `<span class="image-compressor__item-size">${formattedSize}</span>`;

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
                removeButton.addEventListener('click', () => this.onFileRemove(file.name));
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

                resolve(listItem);
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Aktualizacja informacji o skompresowanym obrazie w widoku listy
     * @param {string} fileName - Nazwa pliku
     * @param {number|string} compressedSize - Rozmiar po kompresji (liczba bajtów lub sformatowany string)
     * @param {number|string} ratio - Współczynnik kompresji (liczba lub string z %)
     */
    updateCompressedImageInfo(fileName, compressedSize, ratio) {
        // Walidacja parametrów
        if (!fileName) {
            console.warn('Brak nazwy pliku w updateCompressedImageInfo');
            return;
        }

        // Formatowanie compressedSize jeśli to liczba
        let formattedSize = compressedSize;
        if (typeof compressedSize === 'number') {
            formattedSize = formatFileSize(compressedSize);
        }

        // Formatowanie ratio jeśli to liczba
        let formattedRatio = ratio;
        if (typeof ratio === 'number') {
            formattedRatio = `${ratio}%`;
        }

        const listItem = this.elements.imageGallery.querySelector(`[data-file-name="${fileName}"]`);
        if (!listItem) return;

        // Aktualizacja rozmiaru po kompresji
        const compressedSizeCell = listItem.querySelector('.image-compressor__list-cell--compressed-size');
        if (compressedSizeCell) {
            compressedSizeCell.innerHTML = `<span class="image-compressor__item-compressed-size">${formattedSize}</span>`;
        }

        // Aktualizacja współczynnika kompresji
        const ratioCell = listItem.querySelector('.image-compressor__list-cell--ratio');
        if (ratioCell) {
            ratioCell.innerHTML = `<span class="image-compressor__compression-ratio">${formattedRatio}</span>`;
        }
    }

    /**
     * Usuwa miniaturę pliku z galerii
     * @param {string} fileName - Nazwa pliku do usunięcia
     */
    removeThumbnail(fileName) {
        const thumbnailToRemove = this.elements.imageGallery.querySelector(`[data-file-name="${fileName}"]`);
        if (thumbnailToRemove) {
            this.elements.imageGallery.removeChild(thumbnailToRemove);
        }
    }

    /**
     * Czyści galerię miniatur
     */
    clearGallery() {
        this.elements.imageGallery.innerHTML = '';
    }

    /**
     * Aktualizacja interfejsu użytkownika
     * @param {boolean} hasFiles - Czy są jakieś pliki
     * @param {boolean} isUploading - Czy trwa wysyłanie
     */
    updateUI(hasFiles, isUploading) {
        // Aktualizacja przycisków
        this.elements.compressButton.disabled = !hasFiles || isUploading;
        this.elements.clearButton.disabled = !hasFiles || isUploading;

        // Aktualizacja klasy dla obszaru drop zone
        if (hasFiles) {
            this.elements.dropZone.classList.add('has-files');
        } else {
            this.elements.dropZone.classList.remove('has-files');
        }
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
     * Pokazanie paska postępu
     */
    showProgressBar() {
        this.elements.progressContainer.style.display = 'block';
        this.elements.progressBar.style.width = '0%';
        this.elements.progressText.textContent = '0%';
    }

    /**
     * Ukrycie paska postępu
     * @param {number} delay - Opóźnienie w milisekundach przed ukryciem
     */
    hideProgressBar(delay = 1000) {
        setTimeout(() => {
            this.elements.progressContainer.style.display = 'none';
        }, delay);
    }  

    
}