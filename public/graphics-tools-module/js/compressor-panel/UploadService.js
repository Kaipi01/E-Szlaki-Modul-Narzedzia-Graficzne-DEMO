import {
    generateUUIDv4
} from "../utils/generateId.js";

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
    async uploadFile(file, {
        onProgress,
        onSuccess,
        onError,
        onComplete
    }) {
        const formData = this.prepareFileFormData(file);
        const xhr = new XMLHttpRequest();
        const processHash = generateUUIDv4();
    
        const errorHandler = (errorMessage) => {
            onProgress(0);
            onError(errorMessage);
            console.error(errorMessage);
        }
    
        formData.append('processHash', processHash); 
        
        try {
            // Najpierw nawiąż połączenie SSE
            // await this.monitorCompressionProgress(
            //     processHash,
            //     file.name, {
            //         onProgress,
            //         onSuccess,
            //         onError,
            //         onComplete
            //     }
            // );
            
            // Po pomyślnym nawiązaniu połączenia SSE, wysyłamy plik
            this.activeXHRsMap.set(file.name, xhr);
            this.uploadingImages.push(file.name);
    
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    console.log('Plik wysłany pomyślnie, serwer rozpoczyna kompresję');
                    // Nie robimy nic więcej - postęp będzie śledzony przez SSE
                } else {
                    errorHandler(`Błąd serwera: ${xhr.status} ${xhr.statusText}`);
                }
            });
    
            xhr.addEventListener('error', () => errorHandler('Błąd połączenia z serwerem podczas wysyłania pliku.'));
            xhr.addEventListener('abort', () => errorHandler('Wysyłanie pliku zostało przerwane.'));
    
            xhr.open('POST', this.config.uploadUrl);
            xhr.send(formData);
        } catch (error) {
            errorHandler(`Nie można nawiązać połączenia SSE: ${error.message}`);
        }
    }
    // async uploadFile(file, {
    //     onProgress,
    //     onSuccess,
    //     onError,
    //     onComplete
    // }) {
    //     const formData = this.prepareFileFormData(file);
    //     const xhr = new XMLHttpRequest();
    //     const processHash = generateUUIDv4()

    //     const errorHandler = (errorMessage) => {
    //         onProgress(0);
    //         onError(errorMessage);
    //         console.error(errorMessage);
    //     }

    //     formData.append('processHash', processHash)

    //     // await this.monitorCompressionProgress(
    //     //     processHash,
    //     //     file.name, {
    //     //         onProgress,
    //     //         onSuccess,
    //     //         onError,
    //     //         onComplete
    //     //     }
    //     // );

    //     this.activeXHRsMap.set(file.name, xhr)
    //     this.uploadingImages.push(file.name)

    //     // Obsługa wysyłania pliku
    //     xhr.addEventListener('load', () => {
    //         if (xhr.status >= 200 && xhr.status < 300) { 
    //             // kiedy poprawnie wysłano ustaw od razu na 20%
    //             // onProgress(20); 

    //             // this.monitorCompressionProgress(
    //             //     processHash,
    //             //     file.name, {
    //             //         onProgress,
    //             //         onSuccess,
    //             //         onError,
    //             //         onComplete
    //             //     }
    //             // );

    //         } else {
    //             errorHandler(`Błąd serwera: ${xhr.status} ${xhr.statusText}`);
    //         }
    //     });

    //     xhr.addEventListener('error', () => errorHandler('Błąd połączenia z serwerem podczas wysyłania pliku.'));
    //     xhr.addEventListener('abort', () => errorHandler('Wysyłanie pliku zostało przerwane.'));

    //     xhr.open('POST', this.config.uploadUrl);
    //     xhr.send(formData);
    // }

    /**
     * Monitorowanie postępu kompresji przez Server-Sent Events
     * @param {string} processHash - Identyfikator zadania kompresji
     * @param {string} fileName - Nazwa pliku
     * @param {Object} callbacks
     * @param {Function} callbacks.onProgress - Callback wywoływany przy aktualizacji postępu
     * @param {Function} callbacks.onSuccess - Callback wywoływany przy sukcesie
     * @param {Function} callbacks.onError - Callback wywoływany przy błędzie
     * @param {Function} callbacks.onComplete - Callback wywoływany po zakończeniu
     */
    async monitorCompressionProgress(processHash, fileName, {
        onProgress,
        onSuccess,
        onError,
        onComplete
    }) { 

        return new Promise((resolve, reject) => {
            const sseUrl = `${this.config.trackProgressUrl}/${processHash}`;

            const errorHandler = (errorMessage) => {
                onProgress(0);
                onError(errorMessage);
                console.error(errorMessage);
                reject(errorMessage)
            }

            let eventSource = null;

            try {
                eventSource = new EventSource(sseUrl);

                this.activeEventSourcesMap.set(fileName, eventSource)

                console.log('Utworzono EventSource dla URL:', sseUrl);

                eventSource.onopen = (event) => {
                    console.log('Połączenie SSE otwarte:', event); 
                    resolve()
                };

                eventSource.addEventListener('progress', (event) => {
                    onProgress(parseInt(event.data));
                });

                eventSource.addEventListener('completed', (event) => {
                    try { 
                        this.closeEventSource(eventSource, fileName);
                        onSuccess(event.data);
                        onComplete(processHash);
                    } catch (error) {
                        errorHandler(`Błąd podczas przetwarzania zdarzenia completed: ${error.message}`);
                    }
                });

                eventSource.addEventListener('timeout', (event) => {
                    this.closeEventSource(eventSource, fileName);
                    errorHandler(event.data || 'Timeout podczas kompresji pliku');
                });

                eventSource.addEventListener('error', (event) => {
                    try {
                        this.closeEventSource(eventSource, fileName);
                        console.error(event)
                        errorHandler(event.data || 'Błąd podczas kompresji pliku');
                    } catch(error) {
                        errorHandler(error.message)
                    }
                });

                eventSource.onmessage = (event) => {
                    console.log('Otrzymano wiadomość SSE:', event);

                    onProgress(parseInt(event.data));
                };

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
        }) 
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


// try {
                //     const response = JSON.parse(xhr.responseText);

                //     if (!response.processHash) {
                //         throw new Error('Brak identyfikatora zadania kompresji w odpowiedzi serwera');
                //     } 

                //     this.monitorCompressionProgress(
                //         response.processHash,
                //         file.name, {
                //             onProgress,
                //             onSuccess,
                //             onError,
                //             onComplete
                //         }
                //     );
                // } catch (error) {
                //     errorHandler(`Błąd podczas przetwarzania odpowiedzi: ${error.message}`);
                // }

                // Callbacki
        // this.onProgress = options.onProgress || (() => {});
        // this.onSuccess = options.onSuccess || (() => {});
        // this.onError = options.onError || (() => {});
        // this.onComplete = options.onComplete || (() => {});