import { formatFileSize } from "../utils/file-helpers.js";

/**
 * Klasa InputFileManager
 * 
 * Odpowiedzialna za:
 * - Zarządzanie plikami (dodawanie, usuwanie)
 * - Walidację plików (typ, rozmiar, duplikaty)
 * - Zwracanie informacji o plikach
 */
export default class InputFileManager {
    /** 
     * @param {Object} options - Opcje konfiguracyjne
     * @param {Array<string>} options.allowedTypes - Dozwolone typy plików
     * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
     * @param {Function} options.onFileAdded - Callback wywoływany po dodaniu pliku
     * @param {Function} options.onFileRemoved - Callback wywoływany po usunięciu pliku
     * @param {Function} options.onError - Callback wywoływany przy błędzie walidacji
     */
    constructor(options = {}) {
        this.config = options; 

        this.onFileAdded = options.onFileAdded || (() => {});
        this.onFileRemoved = options.onFileRemoved || (() => {});
        this.onError = options.onError || (() => {});

        /** @type File[] */
        this.files = []; 
    }

    /**
     * Dodaje pliki do managera
     * @param {FileList|Array<File>} fileList - Lista plików do dodania
     * @returns {Array<File>} - Lista pomyślnie dodanych plików
     */
    addFiles(fileList) {
        if (!fileList || fileList.length === 0) return [];

        const newFiles = Array.from(fileList).filter(file => this.validateFile(file));
        
        if (newFiles.length === 0) return [];

        this.files = [...this.files, ...newFiles];

        newFiles.forEach(file => this.onFileAdded(file));

        return newFiles;
    }

    /**
     * Waliduje pojedynczy plik
     * @param {File} file - Plik do walidacji
     * @returns {boolean} - Czy plik przeszedł walidację
     */
    validateFile(file) {
        if (!this.config.allowedTypes.includes(file.type)) {
            const allowedTypesList = this.config.allowedTypes.map(format => {
                return format.replace('image/', '').toUpperCase();
            });

            this.onError(`Plik "${file.name}" ma niedozwolony format. Dozwolone formaty: ${allowedTypesList.join(', ')}.`);
            return false;
        }

        if (file.size > this.config.maxFileSize) {
            this.onError(`Plik "${file.name}" jest zbyt duży. Maksymalny rozmiar pliku to ${formatFileSize(this.config.maxFileSize)}.`);
            return false;
        }

        const isDuplicate = this.files.some(existingFile =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified
        );

        if (isDuplicate) {
            this.onError(`Plik "${file.name}" został już dodany.`);
            return false;
        }

        return true;
    }

    /**
     * Usuwa plik z managera
     * @param {string} fileName - Nazwa pliku do usunięcia
     * @returns {File|null} - Usunięty plik lub null jeśli nie znaleziono
     */
    removeFile(fileName) {
        const fileIndex = this.files.findIndex(file => file.name === fileName);
        
        if (fileIndex === -1) return null;
        
        const removedFile = this.files[fileIndex];
        this.files.splice(fileIndex, 1);
        
        this.onFileRemoved(fileName);
        
        return removedFile;
    } 

    /** Czyści wszystkie pliki */
    clearFiles() {
        const oldFiles = [...this.files];
        this.files = [];
        
        oldFiles.forEach(file => this.onFileRemoved(file.name));
    }

    /**
     * Sprawdza czy manager zawiera jakiekolwiek pliki
     * @returns {boolean} - Czy są jakieś pliki
     */
    hasFiles() {
        return this.files.length > 0;
    } 

    /**
     * Zwraca łączny rozmiar wszystkich plików
     * @returns {number} - Łączny rozmiar w bajtach
     */
    getFilesTotalSize() {
        return this.files.reduce((sum, file) => sum + file.size, 0);
    } 

    /**
     * Pobiera szczegółowe informacje o pliku
     * @param {File} file - Plik
     * @returns {Object} - Obiekt z informacjami o pliku
     */
    getFileDetails(file) {
        return {
            name: file.name,
            size: file.size,
            formattedSize: formatFileSize(file.size),
            type: file.type,
            lastModified: file.lastModified,
            extension: file.name.split('.').pop().toLowerCase()
        };
    }

    /**
     * Pobiera szczegółowe informacje o wszystkich plikach
     * @returns {Array<Object>} - Lista obiektów z informacjami o plikach
     */
    getAllFileDetails() {
        return this.files.map(file => this.getFileDetails(file));
    }
}
