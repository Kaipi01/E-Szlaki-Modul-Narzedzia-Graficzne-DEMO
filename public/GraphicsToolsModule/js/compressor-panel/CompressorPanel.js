'use strict';

import AbstractPanel from '../modules/AbstractPanel.js';
import Toast from '../modules/Toast.js';
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
     * @param {string} options.uploadUrl - URL endpointu do kompresji obrazów
     * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
     * @param {Array} options.allowedTypes - Dozwolone typy plików
     * @param {number} options.maxConcurrentUploads - Maksymalna liczba równoczesnych wysyłek
     * @param {number} options.maxBatchSize - Maksymalna liczba plików w jednej partii
     * @param {number} options.maxBatchSizeBytes - Maksymalny rozmiar partii w bajtach
     */
    constructor(container, options = {}) {
        super(container);

        // Stan panelu
        this.state = {
            uploading: false
        };

        // Inicjalizacja elementów DOM
        this.initElements(); 
        // Inicjalizacja komponentów
        this.initComponents(options); 
    }
 
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

    /** @param {Object} options - Opcje konfiguracyjne */
    initComponents(options) { 
        this.fileManager = new FileManager({
            allowedTypes: options.allowedTypes,
            maxFileSize: options.maxFileSize,
            onFileAdded: this.handleFileAdded.bind(this),
            onFileRemoved: this.handleFileRemoved.bind(this),
            onError: this.showError.bind(this)
        });
 
        this.uiManager = new UICompressorManager(this.elements, {
            onFileSelect: this.handleFileSelect.bind(this),
            onFileRemove: this.handleFileRemove.bind(this),
            onCompress: this.handleCompression.bind(this),
            onClear: this.handleClear.bind(this)
        });
 
        this.uploadService = new UploadService({
            uploadUrl: options.uploadUrl,
            maxBatchSize: options.maxBatchSize,
            maxBatchSizeBytes: options.maxBatchSizeBytes,
            maxConcurrentUploads: options.maxConcurrentUploads,
            onProgress: this.handleUploadProgress.bind(this),
            onSuccess: this.handleUploadSuccess.bind(this),
            onError: this.handleUploadError.bind(this),
            onComplete: this.handleUploadComplete.bind(this)
        });
    } 

    /**
     * Obsługa wyboru plików przez użytkownika
     * @param {FileList} fileList - Lista wybranych plików
     */
    handleFileSelect(fileList) {
        const newFiles = this.fileManager.addFiles(fileList);

        // Renderowanie miniatur dla nowych plików
        newFiles.forEach(file => {
            const fileDetails = this.fileManager.getFileDetails(file);
            this.uiManager.renderThumbnail(file, fileDetails.formattedSize)
                .catch(error => this.showError(`Błąd podczas wczytywania pliku "${file.name}".`));
        });

        // Aktualizacja UI
        this.updateUI();
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
        this.uiManager.removeThumbnail(fileName);
        this.updateUI();
    }

    /** 
     * @param {File} file - Usunięty plik
     */
    handleFileRemoved(file) {
        // Ten callback jest wywoływany przez FileManager
        // Możemy tutaj wykonać dodatkowe operacje po usunięciu pliku
        console.log(`Usunięto plik: ${file.name}`);
        // TODO: dokończ
    }
 
    handleCompression() {
        if (!this.fileManager.hasFiles() || this.state.uploading) return;

        this.state.uploading = true;
        this.updateUI();

        // Pokazanie paska postępu
        this.uiManager.showProgressBar();

        // Rozpoczęcie procesu wysyłania
        const files = this.fileManager.getAllFiles();
        this.uploadService.uploadFiles(files);
    }
 
    handleClear() {
        if (this.state.uploading) return;

        this.fileManager.clearFiles();
        this.uiManager.clearGallery();
        this.updateUI();
    }

    /** 
     * @param {number} percent - Procent postępu (0-100)
     * @param {Array|string} files - Pliki, których dotyczy postęp
     */
    handleUploadProgress(percent, files) {
        this.uiManager.updateProgress(percent);
    }

    /**
     * Obsługa udanego wysłania
     * @param {Object} response - Odpowiedź z serwera
     * @param {Array|File} files - Pliki, których dotyczy odpowiedź
     */
    handleUploadSuccess(response, files) {
        // Jeśli serwer zwraca linki do skompresowanych obrazów, aktualizujemy informacje w widoku listy
        if (response.compressedImages && Array.isArray(response.compressedImages)) {
            response.compressedImages.forEach(image => {
                this.uiManager.updateCompressedImageInfo(
                    image.originalName,
                    image.compressedSize,
                    image.compressionRatio
                );
            });
        }
    }

    /**
     * Obsługa błędu wysyłania
     * @param {string} message - Komunikat błędu
     * @param {Array|File} files - Pliki, których dotyczy błąd
     */
    handleUploadError(message, files) {
        this.showError(message);

        // TODO: dokończ
    }
 
    handleUploadComplete() {
        // Wyświetlenie komunikatu o sukcesie
        this.showSuccess('Wszystkie obrazy zostały pomyślnie skompresowane!');

        // Reset stanu
        this.state.uploading = false;
        this.updateUI();

        // Ukrycie paska postępu po krótkim opóźnieniu
        this.uiManager.hideProgressBar(1000);
    } 

    /** @param {string} message - Treść komunikatu */
    showError(message) {
        super.showError(message, this.elements.compressorAlerts) 
    }

    /** @param {string} message - Treść komunikatu */
    showSuccess(message) { 
        Toast.show(Toast.SUCCESS, message);
    }
 
    updateUI() {
        const hasFiles = this.fileManager.hasFiles();
        this.uiManager.updateUI(hasFiles, this.state.uploading);
    }
}