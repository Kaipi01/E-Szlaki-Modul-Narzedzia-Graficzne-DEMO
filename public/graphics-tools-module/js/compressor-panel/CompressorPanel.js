'use strict';

import AbstractPanel from '../modules/AbstractPanel.js';
import Toast from '../modules/Toast.js';
import { downloadAjaxFile } from '../utils/file-helpers.js';
import FileManager from './FileManager.js';
import UICompressorManager from './UICompressorManager.js';
import UploadService from './UploadService.js';

/**
 * Klasa CompressorPanel służąca do kompresji obrazów 
 * 
 * Odpowiedzialna za:
 * - Koordynację pracy pomiędzy komponentami
 * - Inicjalizację modułów
 * - Zarządzanie przepływem danych
 */
export default class CompressorPanel extends AbstractPanel {
    /**
     * Konstruktor klasy CompressorPanel
     * @param {HTMLElement | string} container 
     * @param {Object} options - Opcje konfiguracyjne
     * @param {string} options.uploadUrl - URL endpointu do kompresji obrazu
     * @param {string} options.imageDataUrl - URL endpointu do danych skompresowanego obrazu
     * @param {string} options.downloadAllImagesUrl - URL endpointu do pobrania wszystkich skompresowanych obrazów
     * @param {string} options.trackProgressUrl - URL endpointu do śledzenia postępu kompresji
     * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
     * @param {Array}  options.allowedTypes - Dozwolone typy plików
     * @param {number} options.maxConcurrentUploads - Maksymalna liczba równoczesnych wysyłek
     * @param {number} options.maxBatchSize - Maksymalna liczba plików w jednej partii
     * @param {number} options.maxBatchSizeBytes - Maksymalny rozmiar partii w bajtach
     */
    constructor(container, options = {}) {
        super(container);

        this.options = options

        // Stan panelu
        this.state = {
            compressedImageHashes: [], // Przechowuje id skompresowanych grafik do pobrania
            uploading: false
        };

        // Inicjalizacja elementów DOM
        this.initElements();
        // Inicjalizacja komponentów
        this.initComponents(options);
    }

    initElements() {
        this.elements = {
            container: this.container,
            dropZone: this.getByAttribute('data-drop-zone'),
            fileInput: this.getByAttribute('data-file-input'),
            selectButton: this.getByAttribute('data-select-button'),
            downloadButtons: this.container.querySelectorAll('[data-download-all-btn]'),
            imageTable: this.getByAttribute('data-image-table'),
            compressButton: this.getByAttribute('data-compress-button'),
            clearButton: this.getByAttribute('data-clear-button'),
            compressorAlerts: this.getByAttribute('data-compressor-alerts'),
            maxFileSizeInfo: this.getByAttribute('max-file-size-info'),
            tableHeadRow: this.getByAttribute('data-table-head-row')
        };

        this.elements.downloadButtons.forEach(btn => btn.addEventListener('click', this.handleDownloadAllImages.bind(this)))

        // TODO: Usuń
        this.elements.downloadButtons.forEach(btn => btn.removeAttribute('disabled'))
    }

    /** @param {Object} options - Opcje konfiguracyjne */
    initComponents(options) {
        this.fileManager = new FileManager({
            ...options,
            onFileAdded: this.handleFileAdded.bind(this),
            onFileRemoved: this.handleFileRemoved.bind(this),
            onError: this.showError.bind(this)
        });

        this.uiManager = new UICompressorManager(this.elements, {
            ...options,
            onFileSelect: this.handleFileSelect.bind(this),
            onFileRemove: this.handleFileRemove.bind(this),
            onCompress: this.handleCompression.bind(this),
            onClear: this.handleClear.bind(this)
        });

        this.uploadService = new UploadService(options);
    }

    handleDownloadAllImages() { 
        try { 
            downloadAjaxFile(this.options.downloadAllImagesUrl, {
                imageHashes: this.state.compressedImageHashes
            }, 'skompresowane-grafiki.zip') 
        } catch(e) {
            this.showError(e.message)
        } 
    }

    /**
     * Obsługa wyboru plików przez użytkownika
     * @param {FileList} fileList - Lista wybranych plików
     */
    handleFileSelect(fileList) {
        const newFiles = this.fileManager.addFiles(fileList);

        // Dla każdego pliku: renderuj wiersze tabeli i natychmiast wyślij na serwer
        newFiles.forEach(file => {
            const fileDetails = this.fileManager.getFileDetails(file);

            // Renderuj wiersze tabeli
            this.uiManager
                .renderImagesInfoTable(file, fileDetails.formattedSize)
                .then(() => {
                    this.uploadFile(file);
                })
                .catch(error => {
                    this.showError(`Błąd podczas wczytywania pliku "${file.name}".`)
                    this.showError(error.message)
                });
        });

        this.updateUI();
    }

    getProgressElementsForFile(fileName) {
        const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
        const row = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);

        if (!row) {
            console.error(`Nie znaleziono wiersza dla pliku: ${fileName}`);
            return null;
        }

        const statusCell = row.querySelector('[data-status]');

        if (!statusCell) {
            console.error(`Nie znaleziono komórki statusu dla pliku: ${fileName}`);
            return null;
        }

        const progressContainer = statusCell.querySelector(`[data-progress-container-${safeFileName}]`);
        const progressBar = statusCell.querySelector(`[data-progress-bar-${safeFileName}]`);
        const progressText = statusCell.querySelector(`[data-progress-text-${safeFileName}]`);

        if (!progressContainer || !progressBar || !progressText) {
            console.error(`Nie znaleziono elementów progress bara dla pliku: ${fileName}`);
            return null;
        }

        return {
            container: progressContainer,
            bar: progressBar,
            text: progressText
        };
    }


    /** @param {File} file */
    uploadFile(file) {
        this.uiManager.showFileProgressBar(file.name);

        const statusCell = this.getStatusCellForFile(file.name);
        const progressNameElement = statusCell.querySelector('.animated-progress-name');

        progressNameElement.textContent = 'Wysyłanie...';

        const uploadCallbacks = {
            onProgress: (percent) => {
                this.uiManager.updateFileProgress(file.name, percent);

                // Aktualizacja tekstu statusu w zależności od postępu
                if (percent < 20) {
                    progressNameElement.textContent = 'Wysyłanie...';
                } else if (percent < 40) {
                    progressNameElement.textContent = 'Przygotowywanie...';
                } else if (percent < 80) {
                    progressNameElement.textContent = 'Kompresja...';
                } else if (percent < 100) {
                    progressNameElement.textContent = 'Finalizacja...';
                } else {
                    progressNameElement.textContent = 'Zakończono';
                }
            },
            // Funkcja wywoływana po zakończeniu kompresji
            onSuccess: (result) => {
                if (result && result.compressedImage) {
                    const compressedImage = result.compressedImage;

                    this.uiManager.updateTableAfterCompression(
                        compressedImage.originalName,
                        compressedImage.compressedSize,
                        compressedImage.compressionRatio,
                        compressedImage.downloadURL
                    );
                } else {
                    // Jeśli nie ma danych o skompresowanym obrazie, oznacz jako sukces
                    this.uiManager.setFileProgressSuccess(file.name);
                }
            },
            // Funkcja wywoływana w przypadku błędu
            onError: (message) => {
                this.showError(`Błąd dla pliku "${file.name}": ${message}`);
                this.uiManager.updateFileProgress(file.name, 0);
                this.uiManager.setFileProgressError(file.name, 'Błąd kompresji');
            }, 
            onComplete: async (operationHash) => {
                const getImageURL = `${this.options.imageDataUrl}/${operationHash}`
                const response = await fetch(getImageURL, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                })

                const { compressedImage: image } = await response.json()

                this.uiManager.updateTableHead()

                this.uiManager.updateTableAfterCompression(
                    image.originalName,
                    image.compressedSize,
                    image.compressionRatio,
                    image.downloadURL
                );
                // this.uiManager.updateFileProgress(file.name, 100);

                this.state.compressedImageHashes.push(operationHash)

                progressNameElement.textContent = 'Zakończono';
            }
        }

        // Wywołanie metody z UploadService do wysłania pliku i monitorowania kompresji
        this.uploadService.uploadFile(file, uploadCallbacks);
    }

    /** @param {string} fileName - Nazwa pliku */
    getStatusCellForFile(fileName) {
        const row = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);

        if (row) {
            return row.querySelector('[data-status]');
        }

        return null;
    }

    /** @param {File} file - Dodany plik */
    handleFileAdded(file) {
        // Ten callback jest wywoływany przez FileManager
        // Możemy tutaj wykonać dodatkowe operacje po dodaniu pliku
        // TODO: dokończ
        console.log(`Dodano plik: ${file.name}`);
    }

    /**
     * Obsługa usunięcia pliku przez użytkownika
     * @param {string} fileName - Nazwa pliku do usunięcia
     */
    handleFileRemove(fileName) {
        this.fileManager.removeFile(fileName);
        this.uiManager.removeTableRow(fileName);
        this.updateUI();
    }

    /** @param {File} file - Usunięty plik */
    handleFileRemoved(file) {
        // Ten callback jest wywoływany przez FileManager
        // Możemy tutaj wykonać dodatkowe operacje po usunięciu pliku
        console.log(`Usunięto plik: ${file.name}`);
        // TODO: dokończ
    }

    handleCompression() {
        if (!this.fileManager.hasFiles()) return;

        // Pobierz wszystkie pliki
        const files = this.fileManager.getAllFiles();

        // Dla każdego pliku, wyślij go osobno
        files.forEach(file => this.uploadFile(file));

        // TODO: Obsłuż wyświetlenie wiadomości o sukcesie kiedy wszystkie grafiki są już skompresowane 

        // const filesPromises = files.map(file => this.uploadFile(file));

        // Promise.all(filesPromises).then(result => {
        //     this.handleAllImagesCompressed()
        // }).catch(err => console.error(err))

        // Wyczyść listę plików po rozpoczęciu wysyłania
        this.fileManager.clearFiles();
        this.updateUI();
    }

    handleClear() {
        if (this.state.uploading) return;

        this.state.compressedImageHashes = []

        this.fileManager.clearFiles();
        this.uiManager.clearTable();
        this.updateUI();
    }

    /** 
     * @param {number} percent - Procent postępu (0-100)
     * @param {string} fileName - Nazwa pliku
     */
    handleUploadProgress(percent, fileName) {
        // this.uiManager.updateProgress(percent);
        console.log(`Progress: ${percent}% dla grafiki o nazwie: ${fileName}`)
    }

    // /**
    //  * Obsługa udanego wysłania
    //  * @param {Object} response - Odpowiedź z serwera 
    //  */
    // handleUploadSuccess(response) { 

    // } 

    // handleAllImagesCompressed() {
    //     Toast.show(Toast.SUCCESS, 'Wszystkie obrazy zostały pomyślnie skompresowane!');

    //     this.state.uploading = false; 
    // }

    /** @param {string} message - Treść komunikatu */
    showError(message) {
        super.showError(message, this.elements.compressorAlerts)
    }

    updateUI() {
        const hasFiles = this.fileManager.hasFiles();
        this.uiManager.updateUI(hasFiles, this.state.uploading);
    }
}