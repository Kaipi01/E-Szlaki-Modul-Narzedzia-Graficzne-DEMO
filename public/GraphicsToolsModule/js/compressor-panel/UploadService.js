/**
 * Klasa UploadService jest odpowiedzialna za:
 * - Wysyłanie plików na serwer (pojedynczo lub w partiach)
 * - Określanie strategii wysyłania
 * - Śledzenie postępu wysyłania
 * - Obsługę odpowiedzi z serwera
 */
export default class UploadService {
    /**
     * Konstruktor klasy UploadService
     * @param {Object} options - Opcje konfiguracyjne
     * @param {string} options.uploadUrl - URL endpointu do kompresji obrazów
     * @param {number} options.maxBatchSize - Maksymalna liczba plików w jednej partii
     * @param {number} options.maxBatchSizeBytes - Maksymalny rozmiar partii w bajtach
     * @param {number} options.maxConcurrentUploads - Maksymalna liczba równoczesnych wysyłek
     * @param {Function} options.onProgress - Callback wywoływany przy aktualizacji postępu
     * @param {Function} options.onSuccess - Callback wywoływany przy sukcesie
     * @param {Function} options.onError - Callback wywoływany przy błędzie
     * @param {Function} options.onComplete - Callback wywoływany po zakończeniu wszystkich wysyłek
     */
    constructor(options = {}) {
        this.config = options;

        if (!this.config.uploadUrl) {
            console.error('UploadServiceError: upload url is undefined!')
        }

        // Callbacki
        this.onProgress = options.onProgress || (() => {});
        this.onSuccess = options.onSuccess || (() => {});
        this.onError = options.onError || (() => {});
        this.onComplete = options.onComplete || (() => {});

        // Stan usługi
        this.state = {
            uploadQueue: [],
            activeUploads: 0,
            totalProgress: {},
            uploadStrategy: 'batch'
        };
    }

    /**
     * Rozpoczyna proces wysyłania plików
     * @param {Array<File>} files - Lista plików do wysłania
     */
    uploadFiles(files) {
        if (!files || files.length === 0) return;

        // Reset stanu
        this.state.uploadQueue = [];
        this.state.activeUploads = 0;
        this.state.totalProgress = {};

        // Inicjalizacja postępu dla każdego pliku
        files.forEach(file => {
            this.state.totalProgress[file.name] = 0;
        });

        // Określenie strategii wysyłania
        this.determineUploadStrategy(files);

        // Rozpoczęcie procesu wysyłania zgodnie z wybraną strategią
        if (this.state.uploadStrategy === 'batch') {
            this.uploadAllFiles(files);
        } else {
            this.prepareUploadQueue(files);
            this.processUploadQueue();
        }
    }

    /**
     * Określa strategię wysyłania na podstawie liczby i rozmiaru plików
     * @param {Array<File>} files - Lista plików do analizy
     */
    determineUploadStrategy(files) {
        const totalFiles = files.length;
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);

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
     * @param {Array<File>} files - Lista plików do podziału na partie
     */
    prepareUploadQueue(files) {
        // Tworzymy kopię tablicy plików do podziału na partie
        const filesToUpload = [...files];

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
            this.onComplete();
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

                // Wywołanie callbacka postępu
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
                    // Wywołanie callbacka sukcesu
                    this.onSuccess(response, file);
                } catch (error) {
                    // Wywołanie callbacka błędu
                    this.onError(`Błąd podczas przetwarzania odpowiedzi dla pliku "${file.name}". ${error.message}`, file);
                }
            } else {
                // Wywołanie callbacka błędu
                this.onError(`Błąd serwera dla pliku "${file.name}": ${xhr.status} ${xhr.statusText}`, file);
            }

            // Kontynuuj przetwarzanie kolejki
            this.processUploadQueue();
        });

        // Obsługa błędu wysyłania
        xhr.addEventListener('error', () => {
            this.onError(`Błąd połączenia podczas wysyłania pliku "${file.name}".`, file);
            this.state.activeUploads--;
            this.processUploadQueue();
        });

        // Obsługa przerwania wysyłania
        xhr.addEventListener('abort', () => {
            this.onError(`Wysyłanie pliku "${file.name}" zostało przerwane.`, file);
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

                // Wywołanie callbacka postępu
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
                    // Wywołanie callbacka sukcesu
                    this.onSuccess(response, files);
                } catch (error) {
                    // Wywołanie callbacka błędu
                    this.onError(`Błąd podczas przetwarzania odpowiedzi dla partii plików. ${error.message}`, files);
                }
            } else {
                // Wywołanie callbacka błędu
                this.onError(`Błąd serwera dla partii plików: ${xhr.status} ${xhr.statusText}`, files);
            }

            // Kontynuuj przetwarzanie kolejki
            this.processUploadQueue();
        });

        // Obsługa błędu wysyłania
        xhr.addEventListener('error', () => {
            this.onError(`Błąd połączenia podczas wysyłania partii plików.`, files);
            this.state.activeUploads--;
            this.processUploadQueue();
        });

        // Obsługa przerwania wysyłania
        xhr.addEventListener('abort', () => {
            this.onError(`Wysyłanie partii plików zostało przerwane.`, files);
            this.state.activeUploads--;
            this.processUploadQueue();
        });

        // Wysłanie żądania
        xhr.open('POST', this.config.uploadUrl);
        xhr.send(formData);
    }

    /**
     * Wysyłanie wszystkich plików jednocześnie
     * @param {Array<File>} files - Tablica plików do wysłania
     */
    uploadAllFiles(files) {
        const formData = this.prepareBatchFormData(files);
        const xhr = new XMLHttpRequest();

        // Obsługa postępu wysyłania
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);

                // Aktualizacja postępu dla wszystkich plików
                files.forEach(file => {
                    this.state.totalProgress[file.name] = percentComplete;
                });

                // Wywołanie callbacka postępu
                this.onProgress(percentComplete, files);
            }
        });

        // Obsługa zakończenia wysyłania
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    // Wywołanie callbacka sukcesu
                    this.onSuccess(response, files);
                } catch (error) {
                    // Wywołanie callbacka błędu
                    this.onError(`Błąd podczas przetwarzania odpowiedzi serwera. ${error.message}`, files);
                }
            } else {
                // Wywołanie callbacka błędu
                this.onError(`Błąd serwera: ${xhr.status} ${xhr.statusText}`, files);
            }

            // Wywołanie callbacka zakończenia
            this.onComplete();
        });

        // Obsługa błędu wysyłania
        xhr.addEventListener('error', () => {
            this.onError('Błąd połączenia z serwerem.', files);
            this.onComplete();
        });

        // Obsługa przerwania wysyłania
        xhr.addEventListener('abort', () => {
            this.onError('Wysyłanie zostało przerwane.', files);
            this.onComplete();
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

        // Wywołanie callbacka postępu
        this.onProgress(Math.round(totalProgress), fileNames);
    }

    /**
     * Anulowanie wszystkich aktywnych wysyłek
     */
    cancelUploads() {
        // Ta metoda mogłaby implementować anulowanie aktywnych żądań XHR
        console.log('Anulowanie wszystkich wysyłek');
        // Implementacja anulowania...
    }
}