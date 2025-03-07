import {
    formatFileSize
} from "../utils/file-helpers.js";
import {
    fadeAnimation
} from "../utils/animations.js";

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
     * @param {HTMLElement} elements.imageTable - Kontener galerii obrazów
     * @param {HTMLButtonElement} elements.compressButton - Przycisk kompresji
     * @param {HTMLButtonElement} elements.clearButton - Przycisk czyszczenia
     * @param {HTMLElement} elements.progressContainer - Kontener paska postępu
     * @param {HTMLElement} elements.progressBar - Pasek postępu
     * @param {HTMLElement} elements.progressText - Tekst postępu
     * @param {HTMLElement} elements.compressorAlerts - Kontener alertów
     * @param {HTMLElement} elements.tableHeadRow 
     * @param {Object} options - Opcje konfiguracyjne
     * @param {Function} options.onFileSelect - Callback wywoływany po wyborze plików
     * @param {Function} options.onFileRemove - Callback wywoływany po usunięciu pliku
     * @param {Function} options.onCompress - Callback wywoływany po kliknięciu przycisku kompresji
     * @param {Function} options.onClear - Callback wywoływany po kliknięciu przycisku czyszczenia
     */
    constructor(elements, options = {}) {
        this.elements = elements;
        this.options = options
        // Callbacki
        this.onFileSelect = options.onFileSelect || (() => {});
        this.onFileRemove = options.onFileRemove || (() => {});
        this.onCompress = options.onCompress || (() => {});
        this.onClear = options.onClear || (() => {});

        // Inicjalizacja nasłuchiwania zdarzeń
        this.attachEventListeners();
        this.initUI()
    }

    initUI() {
        if (this.elements.maxFileSizeInfo) {
            this.elements.maxFileSizeInfo.textContent = this.options.maxFileSize / (1024 * 1024) + " MB"
        }
        this.elements.progressContainer.style.display = "none"
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
     * Renderowanie miniatury obrazu w widoku tabeli
     * @param {File} file - Plik obrazu do wyświetlenia
     * @param {string} formattedSize - Sformatowany rozmiar pliku
     */
    renderImagesInfoTable(file, formattedSize) {

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                const row = document.createElement('tr');
                row.dataset.fileName = file.name;

                // Komórka z miniaturą
                const previewCell = this.createTableCell(`<img src="${event.target.result}" alt="${file.name}" class="preview-image">`, {
                    'data-title': 'Podgląd',
                    'data-preview-image': ''
                });

                // Komórka z nazwą pliku
                const nameCell = this.createTableCell(file.name, {
                    'data-title': 'Nazwa pliku',
                    'data-name': ''
                });

                // Komórka z typem pliku
                const typeCell = this.createTableCell(
                    `<span class="mx-auto badge">${file.type.replace('image/', '').toUpperCase()}</span>`, {
                        'data-title': 'Typ',
                        'data-type': ''
                    }
                );

                const statusCell = this.createTableCell('<span class="mx-auto badge badge--green">Gotowy</span>', {
                    'data-title': 'Status',
                    'data-status': ''
                });

                // Komórka z rozmiarem pliku
                const sizeCell = this.createTableCell(formattedSize, {
                    'data-title': 'Rozmiar',
                    'data-size': ''
                });

                const compressedSizeCell = this.createTableCell('-', {
                    'data-title': 'Rozmiar po kompresji',
                    'data-compressed-size': ''
                });
                compressedSizeCell.classList.add('sr-only')

                const compressedRatioCell = this.createTableCell('-', {
                    'data-title': 'Współczynik kompresji',
                    'data-compressed-ratio': ''
                });
                compressedRatioCell.classList.add('sr-only')

                // Komórka z akcjami (przycisk usuwania)
                const actionsCell = this.createTableCell(`
                    <button class="mx-auto badge image-compressor__item-remove">
                        <i class="fa-solid fa-cloud-arrow-up image-compressor__item-remove-icon"></i> 
                        <span>Usuń</span>
                    </button>
                `, {
                    'data-title': 'Akcje',
                    'data-actions': ''
                });
                const removeButton = actionsCell.querySelector('button');
                removeButton.addEventListener('click', () => this.onFileRemove(file.name));

                row.appendChild(previewCell);
                row.appendChild(nameCell);
                row.appendChild(typeCell);
                row.appendChild(sizeCell);
                row.appendChild(statusCell); 
                row.appendChild(compressedSizeCell)
                row.appendChild(compressedRatioCell)
                row.appendChild(actionsCell);

                this.elements.imageTable.appendChild(row);
                resolve(row);
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Tworzy komórkę tabeli
     * @param {string} content - Zawartość komórki
     * @param {Object} attributes - atrybuty 
     * @returns {HTMLTableCellElement}
     */
    createTableCell(content, attributes = {}) {
        const cell = document.createElement('td');
        cell.innerHTML = content;

        Object.keys(attributes).forEach(key => {
            cell.setAttribute(key, attributes[key])
        });

        return cell;
    }

    /** Aktualizacja nagłówka tabeli po kompresji zdjęć */
    updateTableHead() { 
        const allTableTHElements = Array.from(this.elements.tableHeadRow.children)

        allTableTHElements.forEach(th => th.classList.remove('sr-only'))
        // this.elements.tableHeadRow.lastElementChild?.remove()

        // this.elements.tableHeadRow.append(createTH('Rozmiar po kompresji'))
        // this.elements.tableHeadRow.append(createTH('Poziom kompresji'))
        // this.elements.tableHeadRow.append(createTH('Akcje'))
    }
   

    /**
     * Aktualizacja informacji o skompresowanym obrazie w widoku listy
     * @param {string} fileName - Nazwa pliku
     * @param {number|string} compressedSize - Rozmiar po kompresji (liczba bajtów lub sformatowany string)
     * @param {number|string} ratio - Współczynnik kompresji (liczba lub string z %)
     * @param {string} downloadURL - link do pobrania
     */
    updateTableAfterCompression(fileName, compressedSize, ratio, downloadURL) {
        if (!fileName) {
            console.warn('Brak nazwy pliku w updateTableAfterCompression');
            return;
        }

        const listItem = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);

        if (!listItem) return;  

        const actionsCell = listItem.querySelector('[data-actions]')
        const compressedSizeCell = listItem.querySelector('[data-compressed-size]')
        const compressedRatioCell = listItem.querySelector('[data-compressed-ratio]') 

        compressedSizeCell.innerHTML = `<span class="image-compressor__item-compressed-size">${formatFileSize(parseInt(compressedSize))}</span>` 
        compressedRatioCell.innerHTML = `<span class="image-compressor__compression-ratio">${ratio}%</span>` 
        actionsCell.innerHTML = `
            <a href="${downloadURL}" class="mx-auto badge image-compressor__item-download">
                <i class="fa-solid fa-circle-down image-compressor__item-download-icon"></i>
                <span>Pobierz</span>
            </a>
        ` 

        compressedSizeCell.classList.remove('sr-only')
        compressedRatioCell.classList.remove('sr-only')
    }

    /**
     * Usuwa miniaturę pliku z galerii
     * @param {string} fileName - Nazwa pliku do usunięcia
     */
    removeThumbnail(fileName) {
        const thumbnailToRemove = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);
        
        if (thumbnailToRemove) {
            this.elements.imageTable.removeChild(thumbnailToRemove);
        }
    }

    /**
     * Czyści galerię miniatur
     */
    clearTable() {
        this.elements.imageTable.innerHTML = '';
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
        this.elements.progressBar.setAttribute('per', percent)
    }

    /**
     * Pokazanie paska postępu
     */
    showProgressBar() {
        this.elements.progressContainer.style.removeProperty('display')

        fadeAnimation(() => {
            this.elements.progressBar.style.width = '0%';
            this.elements.progressText.textContent = '0%';
            this.elements.progressBar.setAttribute('per', '0')
        }, [this.elements.progressContainer], 400);
    }

    /**
     * Ukrycie paska postępu
     * @param {number} delay - Opóźnienie w milisekundach przed ukryciem
     */
    hideProgressBar(delay = 3000) {
        setTimeout(() => {
            fadeAnimation(() => {
                this.elements.progressContainer.style.display = 'none';
            }, [this.elements.progressContainer], 400);
        }, delay);
    }
}