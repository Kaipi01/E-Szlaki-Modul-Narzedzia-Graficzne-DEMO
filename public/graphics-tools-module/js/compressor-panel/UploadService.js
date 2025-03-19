/**
 * Klasa UploadService jest odpowiedzialna za:
 * - Wysyłanie plików na serwer
 * - Śledzenie postępu wysyłania
 * - Obsługę odpowiedzi z serwera
 * - Monitorowanie postępu kompresji przez SSE
 */
export default class UploadService {
    /**
     * Konstruktor klasy UploadService
     * @param {Object} options - Opcje konfiguracyjne
     * @param {string} options.uploadUrl - URL endpointu do kompresji obrazu
     * @param {string} options.trackProgressUrl - URL endpointu do śledzenia postępu kompresji
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
        if (!this.config.trackProgressUrl) {
            console.error('UploadServiceError: trackProgressUrl is undefined!')
        }

        // Callbacki
        // this.onProgress = options.onProgress || (() => {});
        // this.onSuccess = options.onSuccess || (() => {});
        // this.onError = options.onError || (() => {});
        // this.onComplete = options.onComplete || (() => {});

        this.uploadingImages = []
        this.activeXHRsMap = new Map();
        this.activeEventSourcesMap = new Map();
    }

    /**
     * Wysyłanie pojedynczego pliku z monitorowaniem postępu kompresji przez SSE
     * @param {File} file - Plik do wysłania
     * @param {Object} callbacks
     * @param {Function} callbacks.onProgress - Callback wywoływany przy aktualizacji postępu
     * @param {Function} callbacks.onSuccess - Callback wywoływany przy sukcesie
     * @param {Function} callbacks.onError - Callback wywoływany przy błędzie
     * @param {Function} callbacks.onComplete - Callback wywoływany po zakończeniu
     */
    uploadFile(file, {
        onProgress,
        onSuccess,
        onError,
        onComplete
    }) {
        const formData = this.prepareFileFormData(file);
        const xhr = new XMLHttpRequest();

        const errorHandler = (errorMessage) => {
            onProgress(0);
            onError(errorMessage); 
            console.error(errorMessage);
        }

        this.activeXHRsMap.set(file.name, xhr)
        this.uploadingImages.push(file.name)

        // Obsługa zakończenia wysyłania pliku
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {

                // kiedy poprawnie wysłano ustaw od razu na 20%
                onProgress(20);

                try {
                    const response = JSON.parse(xhr.responseText);

                    if (!response.processId) {
                        throw new Error('Brak identyfikatora zadania kompresji w odpowiedzi serwera');
                    } 

                    this.monitorCompressionProgress(
                        response.processId,
                        file.name, {
                            onProgress,
                            onSuccess,
                            onError,
                            onComplete
                        }
                    );
                } catch (error) {
                    errorHandler(`Błąd podczas przetwarzania odpowiedzi: ${error.message}`);
                }
            } else {
                errorHandler(`Błąd serwera: ${xhr.status} ${xhr.statusText}`);
            }
        });

        xhr.addEventListener('error', () => {
            errorHandler('Błąd połączenia z serwerem podczas wysyłania pliku.');
        });

        xhr.addEventListener('abort', () => {
            errorHandler('Wysyłanie pliku zostało przerwane.');
        });

        xhr.open('POST', this.config.uploadUrl);
        xhr.send(formData);
    }

    /**
     * Monitorowanie postępu kompresji przez Server-Sent Events
     * @param {string} processId - Identyfikator zadania kompresji
     * @param {string} fileName - Nazwa pliku
     * @param {Object} callbacks
     * @param {Function} callbacks.onProgress - Callback wywoływany przy aktualizacji postępu
     * @param {Function} callbacks.onSuccess - Callback wywoływany przy sukcesie
     * @param {Function} callbacks.onError - Callback wywoływany przy błędzie
     * @param {Function} callbacks.onComplete - Callback wywoływany po zakończeniu
     */
    monitorCompressionProgress(processId, fileName, {onProgress, onSuccess, onError, onComplete}) {

        const sseUrl = `${this.config.trackProgressUrl}/${encodeURIComponent(processId)}`;

        const errorHandler = (errorMessage) => {
            onProgress(0);
            onError(errorMessage); 
            console.error(errorMessage);
        }

        let eventSource = null;

        try {
            eventSource = new EventSource(sseUrl);

            this.activeEventSourcesMap.set(fileName, eventSource) 

            eventSource.onmessage = (event) => {
                console.log(event)
            }
            eventSource.onerror = (event) => {
                console.error(event)
            }

            eventSource.addEventListener('progress', (event) => {
                try {
                    const data = JSON.parse(event.data);

                    onProgress(Math.round(data.progress));
                } catch (error) {
                    errorHandler(`Błąd podczas przetwarzania zdarzenia progress: ${error.message}`);
                }
            });

            eventSource.addEventListener('completed', (event) => {
                try {
                    const data = JSON.parse(event.data);

                    this.closeEventSource(eventSource, fileName);
                    onSuccess(data.result);
                    onComplete(processId);
                } catch (error) {
                    errorHandler(`Błąd podczas przetwarzania zdarzenia completed: ${error.message}`);
                }
            });

            eventSource.addEventListener('timeout', (event) => {
                try {
                    const data = JSON.parse(event.data);

                    this.closeEventSource(eventSource, fileName);
                    errorHandler(data.message || 'Timeout podczas kompresji pliku');

                } catch (error) {
                    errorHandler(`Błąd podczas przetwarzania zdarzenia timeout: ${error.message}`);
                }
            });

            eventSource.addEventListener('error', (event) => {
                try {
                    const data = JSON.parse(event.data);

                    this.closeEventSource(eventSource, fileName);
                    errorHandler(data.message || 'Błąd podczas kompresji pliku');

                } catch (error) {
                    errorHandler(`Błąd podczas przetwarzania zdarzenia error: ${error.message}`);
                }
            });

            eventSource.onerror = (event) => {
                this.closeEventSource(eventSource, fileName);
                errorHandler('Utracono połączenie z serwerem podczas monitorowania kompresji');
            };
        } catch (error) {
            if (eventSource) {
                this.closeEventSource(eventSource, fileName);
            }
            errorHandler(`Nie można monitorować postępu kompresji: ${error.message}`);
        }
    }

    /**
     * Bezpieczne zamknięcie połączenia EventSource
     * @param {EventSource} eventSource - Obiekt EventSource do zamknięcia
     * @param {string} fileName - nazwa pliku, którego dotyczy połączenie
     */
    closeEventSource(eventSource, fileName) {
        if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
            // Usunięcie wszystkich nasłuchiwaczy zdarzeń
            eventSource.onmessage = null;
            eventSource.onerror = null;

            // Zamknięcie połączenia
            eventSource.close();

            this.activeEventSourcesMap.delete(fileName)

            // Usunięcie z listy uploadingImages
            const index = this.uploadingImages.indexOf(fileName);
            if (index !== -1) {
                this.uploadingImages.splice(index, 1);
            }
        }
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

    /** Anulowanie wszystkich aktywnych wysyłek */
    cancelAllUploads() {
        this.uploadingImages.forEach(imageName => this.cancelUpload(imageName))

        this.uploadingImages = []
    }

    /** @param {string} fileName */
    cancelUpload(fileName) {
        const xhr = this.activeXHRsMap.get(fileName)
        const eventSource = this.activeEventSourcesMap.get(fileName)

        if (xhr) {
            xhr.abort();
            this.activeXHRsMap.delete(fileName);
        }

        if (eventSource) {
            this.closeEventSource(eventSource, fileName);
        }
    }
}