import { formatFileSize } from "../utils/file-helpers.js";

/**
 * Klasa FileManager
 * 
 * Odpowiedzialna za:
 * - Zarządzanie plikami (dodawanie, usuwanie)
 * - Walidację plików (typ, rozmiar, duplikaty)
 * - Formatowanie informacji o plikach
 */
export default class FileManager {
    /**
     * Konstruktor klasy FileManager
     * @param {Object} options - Opcje konfiguracyjne
     * @param {Array<string>} options.allowedTypes - Dozwolone typy plików
     * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
     * @param {Function} options.onFileAdded - Callback wywoływany po dodaniu pliku
     * @param {Function} options.onFileRemoved - Callback wywoływany po usunięciu pliku
     * @param {Function} options.onError - Callback wywoływany przy błędzie walidacji
     */
    constructor(options = {}) {
        this.config = options;

        // Callbacki
        this.onFileAdded = options.onFileAdded || (() => {});
        this.onFileRemoved = options.onFileRemoved || (() => {});
        this.onError = options.onError || (() => {});

        // Stan
        this.files = []; // Lista przechowywanych plików
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

        // Dodanie nowych plików do stanu
        this.files = [...this.files, ...newFiles];

        // Powiadomienie o dodaniu plików
        newFiles.forEach(file => this.onFileAdded(file));

        return newFiles;
    }

    /**
     * Waliduje pojedynczy plik
     * @param {File} file - Plik do walidacji
     * @returns {boolean} - Czy plik przeszedł walidację
     */
    validateFile(file) {
        // Sprawdzenie czy plik jest obrazem o dozwolonym typie
        if (!this.config.allowedTypes.includes(file.type)) {
            const allowedTypesList = this.config.allowedTypes.map(format => {
                return format.replace('image/', '').toUpperCase();
            });

            this.onError(`Plik "${file.name}" ma niedozwolony format. Dozwolone formaty: ${allowedTypesList.join(', ')}.`);
            return false;
        }

        // Sprawdzenie rozmiaru pliku
        if (file.size > this.config.maxFileSize) {
            this.onError(`Plik "${file.name}" jest zbyt duży. Maksymalny rozmiar pliku to ${formatFileSize(this.config.maxFileSize)}.`);
            return false;
        }

        // Sprawdzenie czy plik nie został już dodany
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
        
        // Powiadomienie o usunięciu pliku
        this.onFileRemoved(removedFile);
        
        return removedFile;
    }

    /**
     * Pobiera wszystkie pliki
     * @returns {Array<File>} - Lista wszystkich plików
     */
    getAllFiles() {
        return [...this.files];
    }

    /**
     * Pobiera plik po nazwie
     * @param {string} fileName - Nazwa pliku
     * @returns {File|undefined} - Znaleziony plik lub undefined
     */
    getFileByName(fileName) {
        return this.files.find(file => file.name === fileName);
    }

    /**
     * Czyści wszystkie pliki
     */
    clearFiles() {
        const oldFiles = [...this.files];
        this.files = [];
        
        // Powiadomienie o usunięciu każdego pliku
        oldFiles.forEach(file => this.onFileRemoved(file));
    }

    /**
     * Sprawdza czy manager zawiera jakiekolwiek pliki
     * @returns {boolean} - Czy są jakieś pliki
     */
    hasFiles() {
        return this.files.length > 0;
    }

    /**
     * Zwraca liczbę plików
     * @returns {number} - Liczba plików
     */
    getFileCount() {
        return this.files.length;
    }

    /**
     * Zwraca łączny rozmiar wszystkich plików
     * @returns {number} - Łączny rozmiar w bajtach
     */
    getTotalSize() {
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

    /**
     * Sortuje pliki według wybranego kryterium
     * @param {string} criterion - Kryterium sortowania (name, size, type)
     * @param {boolean} ascending - Czy sortować rosnąco
     */
    sortFiles(criterion = 'name', ascending = true) {
        const sortFunctions = {
            name: (a, b) => a.name.localeCompare(b.name),
            size: (a, b) => a.size - b.size,
            type: (a, b) => a.type.localeCompare(b.type),
            date: (a, b) => a.lastModified - b.lastModified
        };

        const sortFunction = sortFunctions[criterion] || sortFunctions.name;
        
        this.files.sort((a, b) => {
            return ascending ? sortFunction(a, b) : sortFunction(b, a);
        });
    }

    /**
     * Filtruje pliki według typu
     * @param {string} type - Typ MIME pliku
     * @returns {Array<File>} - Przefiltrowana lista plików
     */
    filterByType(type) {
        return this.files.filter(file => file.type === type);
    }

    /**
     * Sprawdza czy plik jest obrazem
     * @param {File} file - Plik do sprawdzenia
     * @returns {boolean} - Czy plik jest obrazem
     */
    isImage(file) {
        return file.type.startsWith('image/');
    }

    /**
     * Zwraca tylko pliki będące obrazami
     * @returns {Array<File>} - Lista plików będących obrazami
     */
    getOnlyImages() {
        return this.files.filter(file => this.isImage(file));
    }
}
