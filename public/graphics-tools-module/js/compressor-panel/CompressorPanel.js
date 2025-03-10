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

        this.options = options

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
            container: this.container,
            dropZone: this.getByAttribute('data-drop-zone'),
            fileInput: this.getByAttribute('data-file-input'),
            selectButton: this.getByAttribute('data-select-button'),
            imageTable: this.getByAttribute('data-image-table'),
            compressButton: this.getByAttribute('data-compress-button'),
            clearButton: this.getByAttribute('data-clear-button'),
            // progressContainer: this.getByAttribute('data-progress-container'),
            // progressBar: this.getByAttribute('data-progress-bar'),
            // progressText: this.getByAttribute('data-progress-text'),
            compressorAlerts: this.getByAttribute('data-compressor-alerts'),
            maxFileSizeInfo: this.getByAttribute('max-file-size-info'),
            tableHeadRow: this.getByAttribute('data-table-head-row')
        };
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
 
        this.uploadService = new UploadService({
            ...options,
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
    
        // Dla każdego pliku: renderuj miniaturę i natychmiast wyślij na serwer
        newFiles.forEach(file => {
            const fileDetails = this.fileManager.getFileDetails(file);
            
            // Renderuj miniaturę
            this.uiManager
                .renderImagesInfoTable(file, fileDetails.formattedSize)
                .then(() => {
                    // Po wyrenderowaniu miniatury, wyślij plik od razu
                    this.uploadSingleFile(file);
                })
                .catch(error => this.showError(`Błąd podczas wczytywania pliku "${file.name}".`));
        });
    
        // Aktualizacja UI
        this.updateUI();
    }  

    getProgressElementsForFile(fileName) {
        // Tworzymy bezpieczną wersję nazwy pliku do użycia w selektorach
        const safeFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Znajdujemy wiersz tabeli dla danego pliku
        const row = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);
        
        if (!row) {
            console.warn(`Nie znaleziono wiersza dla pliku: ${fileName}`);
            return null;
        }
        
        // Znajdujemy komórkę ze statusem/progress barem
        const statusCell = row.querySelector('[data-status]');
        
        if (!statusCell) {
            console.warn(`Nie znaleziono komórki statusu dla pliku: ${fileName}`);
            return null;
        }
        
        // Pobieramy elementy progress bara
        const progressContainer = statusCell.querySelector(`[data-progress-container-${safeFileName}]`);
        const progressBar = statusCell.querySelector(`[data-progress-bar-${safeFileName}]`);
        const progressText = statusCell.querySelector(`[data-progress-text-${safeFileName}]`);
        
        if (!progressContainer || !progressBar || !progressText) {
            console.warn(`Nie znaleziono elementów progress bara dla pliku: ${fileName}`);
            return null;
        }
        
        return {
            container: progressContainer,
            bar: progressBar,
            text: progressText
        };
    }


     /** @param {File} file - Dodany plik */
     uploadSingleFile(file) {
        // Pokazanie paska postępu dla tego pliku
        this.uiManager.showFileProgressBar(file.name);
        
        // Aktualizacja statusu w UI
        const statusCell = this.getStatusCellForFile(file.name);
        if (statusCell) {
            const progressNameElement = statusCell.querySelector('.animated-progress-name');
            if (progressNameElement) {
                progressNameElement.textContent = 'Wysyłanie...';
            }
        }
        
        // Funkcja do aktualizacji postępu
        const onSingleFileProgress = (percent) => {
            this.uiManager.updateFileProgress(file.name, percent);
            
            // Aktualizacja tekstu statusu w zależności od postępu
            if (statusCell) {
                const progressNameElement = statusCell.querySelector('.animated-progress-name');
                if (progressNameElement) {
                    if (percent < 20) {
                        progressNameElement.textContent = 'Wysyłanie...';
                    } else if (percent < 100) {
                        progressNameElement.textContent = 'Kompresja...';
                    } else {
                        progressNameElement.textContent = 'Zakończono';
                    }
                }
            }
        };
        
        // Funkcja wywoływana po zakończeniu kompresji
        const onSingleFileSuccess = (result) => {
            if (result && result.compressedImages && result.compressedImages.length > 0) {
                const compressedImage = result.compressedImages[0];
                this.uiManager.updateTableAfterCompression(
                    compressedImage.originalName,
                    compressedImage.compressedSize,
                    compressedImage.compressionRatio,
                    compressedImage.imageDownloadURL
                );
            } else {
                // Jeśli nie ma danych o skompresowanym obrazie, oznacz jako sukces
                this.uiManager.setFileProgressSuccess(file.name);
            }
        };
        
        // Funkcja wywoływana w przypadku błędu
        const onSingleFileError = (message) => {
            this.showError(`Błąd dla pliku "${file.name}": ${message}`);
            this.uiManager.setFileProgressError(file.name, 'Błąd kompresji');
        };
        
        // Funkcja wywoływana po zakończeniu procesu (sukces lub błąd)
        const onSingleFileComplete = () => {
            // Tutaj możesz dodać dodatkowe operacje po zakończeniu
            console.log(`Zakończono proces dla pliku: ${file.name}`);
        };
        
        // Wywołanie metody z UploadService do wysłania pliku i monitorowania kompresji
        this.uploadService.uploadSingleFileWithCallbacks(
            file, 
            onSingleFileProgress, 
            onSingleFileSuccess, 
            onSingleFileError, 
            onSingleFileComplete
        );
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
        this.uiManager.removeThumbnail(fileName);
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
        files.forEach(file => {
            this.uploadSingleFile(file);
        });
        
        // Wyczyść listę plików po rozpoczęciu wysyłania
        this.fileManager.clearFiles();
        this.updateUI();
    } 
 
    handleClear() {
        if (this.state.uploading) return;

        this.fileManager.clearFiles();
        this.uiManager.clearTable();
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
        const { compressedImages } = response

        console.log("--------------- handleUploadSuccess --------------")
        console.log("response: ", response)
        console.log("files: ", files)
        console.log("compressedImages: ", compressedImages)
        console.log("--------------------------------------------------")
        
        if (compressedImages && Array.isArray(compressedImages)) { 
            this.uiManager.updateTableHead()

            compressedImages.forEach(image => {
                this.uiManager.updateTableAfterCompression(
                    image.originalName,
                    image.compressedSize,
                    image.compressionRatio,
                    image.imageDownloadURL
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
        // this.uiManager.hideProgressBar();
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





    //  uploadSingleFile(file) {
    //     // Tworzymy tablicę z jednym plikiem
    //     const singleFileArray = [file];
        
    //     // Używamy naszej własnej funkcji do śledzenia postępu dla tego pliku
    //     const onSingleFileProgress = (percent) => {
    //         const progressElements = this.getProgressElementsForFile(file.name);
            
    //         if (progressElements) {
    //             progressElements.bar.style.width = `${percent}%`;
    //             progressElements.text.textContent = `${percent}%`;
    //             progressElements.bar.setAttribute('per', percent);
    //         } else {
    //             // Jeśli nie możemy znaleźć elementów progress bara, używamy metody z UIManager
    //             this.uiManager.updateFileProgress(file.name, percent);
    //         }
    //     };
        
    //     // Używamy naszej własnej funkcji do obsługi sukcesu dla tego pliku
    //     const onSingleFileSuccess = (response) => {
    //         if (response && response.compressedImages && response.compressedImages.length > 0) {
    //             const compressedImage = response.compressedImages[0];
    //             this.uiManager.updateTableAfterCompression(
    //                 compressedImage.originalName,
    //                 compressedImage.compressedSize,
    //                 compressedImage.compressionRatio,
    //                 compressedImage.imageDownloadURL
    //             );
    //         }
    //     };
        
    //     // Używamy naszej własnej funkcji do obsługi błędu dla tego pliku
    //     const onSingleFileError = (message) => {
    //         this.showError(`Błąd dla pliku "${file.name}": ${message}`);
            
    //         // Aktualizacja statusu w tabeli, aby pokazać błąd
    //         const row = this.elements.imageTable.querySelector(`[data-file-name="${file.name}"]`);
    //         if (row) {
    //             const statusCell = row.querySelector('[data-status]');
    //             if (statusCell) {
    //                 statusCell.innerHTML = '<span class="mx-auto badge badge--red">Błąd</span>';
    //             }
    //         }
    //     };
        
    //     // Używamy naszej własnej funkcji do obsługi zakończenia dla tego pliku
    //     const onSingleFileComplete = () => {
    //         // Możemy tutaj dodać dodatkową logikę po zakończeniu wysyłania pliku
    //     };
        
    //     // Wysyłamy plik z własnymi callbackami
    //     this.uploadService.uploadSingleFileWithCallbacks(
    //         file, 
    //         onSingleFileProgress, 
    //         onSingleFileSuccess, 
    //         onSingleFileError, 
    //         onSingleFileComplete
    //     );
    // } 