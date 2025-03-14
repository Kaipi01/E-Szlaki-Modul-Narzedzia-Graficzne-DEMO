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
     * @param {string} options.uploadUrl - URL endpointu do kompresji obrazów
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
     * Anulowanie wszystkich aktywnych wysyłek
     */
    cancelUploads() {
        // Ta metoda mogłaby implementować anulowanie aktywnych żądań XHR
        console.log('Anulowanie wszystkich wysyłek');
        //TODO: Implementacja anulowania...
    }

    /**
     * Wysyłanie pojedynczego pliku z monitorowaniem postępu kompresji przez SSE
     * @param {File} file - Plik do wysłania
     * @param {Function} onProgress - Callback wywoływany przy aktualizacji postępu
     * @param {Function} onSuccess - Callback wywoływany przy sukcesie
     * @param {Function} onError - Callback wywoływany przy błędzie
     * @param {Function} onComplete - Callback wywoływany po zakończeniu
     */
    uploadSingleFileWithCallbacks(file, onProgress, onSuccess, onError, onComplete) {
        // Przygotowanie danych do wysłania
        const formData = this.prepareFileFormData(file);
        const xhr = new XMLHttpRequest();
        let eventSource = null;

        // Obsługa postępu wysyłania pliku
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                // Ograniczamy postęp wysyłania do maksymalnie 20%
                const uploadPercentComplete = Math.round((event.loaded / event.total) * 100);
                const adjustedPercentComplete = Math.min(uploadPercentComplete / 5, 20); // Maksymalnie 20%

                // Wywołanie callbacka z aktualnym postępem wysyłania
                onProgress(adjustedPercentComplete);
            }
        });

        // Obsługa zakończenia wysyłania pliku
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    // Parsowanie odpowiedzi JSON
                    const response = JSON.parse(xhr.responseText);

                    // Sprawdzenie, czy odpowiedź zawiera identyfikator zadania kompresji
                    if (!response.processId) {
                        throw new Error('Brak identyfikatora zadania kompresji w odpowiedzi serwera');
                    }

                    // Rozpoczęcie nasłuchiwania na aktualizacje postępu kompresji przez SSE
                    this.monitorCompressionProgress(
                        response.processId,
                        file.name,
                        onProgress,
                        onSuccess,
                        onError,
                        onComplete
                    );
                } catch (error) {
                    // Obsługa błędu parsowania odpowiedzi
                    onError(`Błąd podczas przetwarzania odpowiedzi: ${error.message}`);
                    onComplete();
                }
            } else {
                // Obsługa błędu HTTP
                onError(`Błąd serwera: ${xhr.status} ${xhr.statusText}`);
                onComplete();
            }
        });

        // Obsługa błędu połączenia
        xhr.addEventListener('error', () => {
            onError('Błąd połączenia z serwerem podczas wysyłania pliku.');
            onComplete();
        });

        // Obsługa przerwania wysyłania
        xhr.addEventListener('abort', () => {
            onError('Wysyłanie pliku zostało przerwane.');
            onComplete();
        });

        // Wysłanie żądania
        xhr.open('POST', this.config.uploadUrl);
        xhr.send(formData);
    }

    /**
     * Monitorowanie postępu kompresji przez Server-Sent Events
     * @param {string} processId - Identyfikator zadania kompresji
     * @param {string} fileName - Nazwa pliku
     * @param {Function} onProgress - Callback wywoływany przy aktualizacji postępu
     * @param {Function} onSuccess - Callback wywoływany przy sukcesie
     * @param {Function} onError - Callback wywoływany przy błędzie
     * @param {Function} onComplete - Callback wywoływany po zakończeniu
     */
    monitorCompressionProgress(processId, fileName, onProgress, onSuccess, onError, onComplete) { 
        // stała TRACK_COMPRESSION_PROGRESS_URL jest zadeklarowana w graphics_tools_module/compressor_panel/index.html.twig
        const sseUrl = `${TRACK_COMPRESSION_PROGRESS_URL}/${encodeURIComponent(processId)}`;

        // Zmienna do przechowywania referencji do obiektu EventSource
        let eventSource = null; 

        try {
            // Utworzenie obiektu EventSource do nasłuchiwania na aktualizacje
            eventSource = new EventSource(sseUrl);

            // Nasłuchiwanie na domyślne zdarzenia (bez nazwy)
            eventSource.onmessage = (event) => {
                try {
                    // Parsowanie danych JSON
                    const data = JSON.parse(event.data);

                    // Przeliczenie postępu kompresji (20-100%)
                    // 20% to wysyłanie pliku, 80% to kompresja
                    const compressionPercent = 20 + (data.progress * 0.8);

                    // Wywołanie callbacka z aktualnym postępem
                    onProgress(Math.round(compressionPercent));

                    // Jeśli kompresja zakończona, zamknij połączenie i wywołaj callback sukcesu
                    if (data.completed) {
                        // Zamknięcie połączenia SSE
                        this.closeEventSource(eventSource);

                        // Wywołanie callbacka sukcesu z wynikiem kompresji
                        onSuccess(data.result);

                        // Wywołanie callbacka zakończenia
                        onComplete();
                    }
                } catch (error) {
                    // Obsługa błędu parsowania danych
                    this.closeEventSource(eventSource);
                    onError(`Błąd podczas przetwarzania danych postępu: ${error.message}`);
                    onComplete();
                }
            };

            // Nasłuchiwanie na nazwane zdarzenie 'progress'
            eventSource.addEventListener('progress', (event) => {
                try {
                    // Parsowanie danych JSON
                    const data = JSON.parse(event.data);

                    // Przeliczenie postępu kompresji (20-100%)
                    const compressionPercent = 20 + (data.progress * 0.8);

                    // Wywołanie callbacka z aktualnym postępem
                    onProgress(Math.round(compressionPercent));
                } catch (error) {
                    console.warn('Błąd podczas przetwarzania zdarzenia progress:', error);
                }
            });

            // Nasłuchiwanie na nazwane zdarzenie 'completed'
            eventSource.addEventListener('completed', (event) => {
                try {
                    // Parsowanie danych JSON
                    const data = JSON.parse(event.data);

                    // Zamknięcie połączenia SSE
                    this.closeEventSource(eventSource);

                    // Wywołanie callbacka sukcesu z wynikiem kompresji
                    onSuccess(data.result);

                    // Wywołanie callbacka zakończenia
                    onComplete();
                } catch (error) {
                    console.warn('Błąd podczas przetwarzania zdarzenia completed:', error);
                }
            });

            // Nasłuchiwanie na nazwane zdarzenie 'error'
            eventSource.addEventListener('error_event', (event) => {
                try {
                    // Parsowanie danych JSON
                    const data = JSON.parse(event.data);

                    // Zamknięcie połączenia SSE
                    this.closeEventSource(eventSource);

                    // Wywołanie callbacka błędu
                    onError(data.message || 'Błąd podczas kompresji pliku');

                    // Wywołanie callbacka zakończenia
                    onComplete();
                } catch (error) {
                    console.warn('Błąd podczas przetwarzania zdarzenia error_event:', error);
                }
            });

            // Obsługa błędów połączenia SSE
            eventSource.onerror = (event) => {
                // Zamknięcie połączenia SSE
                this.closeEventSource(eventSource);

                // Wywołanie callbacka błędu
                onError('Utracono połączenie z serwerem podczas monitorowania kompresji');

                // Wywołanie callbacka zakończenia
                onComplete();
            };
        } catch (error) {
            // Obsługa błędu utworzenia obiektu EventSource
            if (eventSource) {
                this.closeEventSource(eventSource);
            }

            onError(`Nie można monitorować postępu kompresji: ${error.message}`);
            onComplete();
        }
    }

    /**
     * Bezpieczne zamknięcie połączenia EventSource
     * @param {EventSource} eventSource - Obiekt EventSource do zamknięcia
     */
    closeEventSource(eventSource) {
        if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
            // Usunięcie wszystkich nasłuchiwaczy zdarzeń
            eventSource.onmessage = null;
            eventSource.onerror = null;

            // Zamknięcie połączenia
            eventSource.close();
        }
    }
}











// /**
//  * Klasa UploadService jest odpowiedzialna za:
//  * - Wysyłanie plików na serwer (pojedynczo lub w partiach)
//  * - Określanie strategii wysyłania
//  * - Śledzenie postępu wysyłania
//  * - Obsługę odpowiedzi z serwera
//  */
// export default class UploadService {
//     /**
//      * Konstruktor klasy UploadService
//      * @param {Object} options - Opcje konfiguracyjne
//      * @param {string} options.uploadUrl - URL endpointu do kompresji obrazów
//      * @param {number} options.maxBatchSize - Maksymalna liczba plików w jednej partii
//      * @param {number} options.maxBatchSizeBytes - Maksymalny rozmiar partii w bajtach
//      * @param {number} options.maxConcurrentUploads - Maksymalna liczba równoczesnych wysyłek
//      * @param {Function} options.onProgress - Callback wywoływany przy aktualizacji postępu
//      * @param {Function} options.onSuccess - Callback wywoływany przy sukcesie
//      * @param {Function} options.onError - Callback wywoływany przy błędzie
//      * @param {Function} options.onComplete - Callback wywoływany po zakończeniu wszystkich wysyłek
//      */
//     constructor(options = {}) {
//         this.config = options;

//         if (!this.config.uploadUrl) {
//             console.error('UploadServiceError: upload url is undefined!')
//         }

//         // Callbacki
//         this.onProgress = options.onProgress || (() => {});
//         this.onSuccess = options.onSuccess || (() => {});
//         this.onError = options.onError || (() => {});
//         this.onComplete = options.onComplete || (() => {});

//         // Stan usługi
//         this.state = {
//             uploadQueue: [],
//             activeUploads: 0,
//             totalProgress: {},
//             uploadStrategy: 'batch'
//         };
//     }

//     /**
//      * Rozpoczyna proces wysyłania plików
//      * @param {Array<File>} files - Lista plików do wysłania
//      */
//     uploadFiles(files) {
//         if (!files || files.length === 0) return;

//         // Reset stanu
//         this.state.uploadQueue = [];
//         this.state.activeUploads = 0;
//         this.state.totalProgress = {};

//         // Inicjalizacja postępu dla każdego pliku
//         files.forEach(file => {
//             this.state.totalProgress[file.name] = 0;
//         });

//         // Przygotuj kolejkę z pojedynczymi plikami
//         files.forEach(file => {
//             this.state.uploadQueue.push({
//                 type: 'single',
//                 file: file
//             });
//         });

//         // Rozpocznij przetwarzanie kolejki
//         this.processUploadQueue();
//     } 

//     /**
//      * Przygotowuje kolejkę wysyłania, dzieląc pliki na partie
//      * @param {Array<File>} files - Lista plików do podziału na partie
//      */
//     prepareUploadQueue(files) {
//         // Tworzymy kopię tablicy plików do podziału na partie
//         const filesToUpload = [...files];

//         // Dzielimy pliki na partie
//         while (filesToUpload.length > 0) {
//             let currentBatchSize = 0;
//             const batch = [];

//             // Dodajemy pliki do partii, dopóki nie przekroczymy limitów
//             while (filesToUpload.length > 0 &&
//                 batch.length < this.config.maxBatchSize &&
//                 currentBatchSize + filesToUpload[0].size <= this.config.maxBatchSizeBytes) {
//                 const file = filesToUpload.shift();
//                 batch.push(file);
//                 currentBatchSize += file.size;
//             }

//             // Jeśli batch zawiera tylko jeden plik, dodajemy go jako pojedynczy plik
//             if (batch.length === 1) {
//                 this.state.uploadQueue.push({
//                     type: 'single',
//                     file: batch[0]
//                 });
//             } else {
//                 this.state.uploadQueue.push({
//                     type: 'batch',
//                     files: batch
//                 });
//             }
//         }

//         console.log(`Przygotowano ${this.state.uploadQueue.length} partii do wysłania`);
//     }

//     /**
//      * Przetwarzanie kolejki wysyłania
//      */
//     processUploadQueue() {
//         // Jeśli kolejka jest pusta, zakończ proces
//         if (this.state.uploadQueue.length === 0 && this.state.activeUploads === 0) {
//             this.onComplete();
//             return;
//         }

//         // Dopóki można rozpocząć nowe wysyłanie, rozpocznij je
//         while (this.state.activeUploads < this.config.maxConcurrentUploads && this.state.uploadQueue.length > 0) {
//             const item = this.state.uploadQueue.shift();
//             this.state.activeUploads++;

//             if (item.type === 'single') {
//                 this.uploadSingleFile(item.file);
//             } else {
//                 this.uploadFileBatch(item.files);
//             }
//         }
//     }

//     /**
//      * Wysyłanie pojedynczego pliku
//      * @param {File} file - Plik do wysłania
//      */
//     uploadSingleFile(file) {
//         // Pokazanie paska postępu dla tego pliku
//         this.uiManager.showFileProgressBar(file.name);

//         // Używamy naszej własnej funkcji do śledzenia postępu dla tego pliku
//         const onSingleFileProgress = (percent) => {
//             this.uiManager.updateFileProgress(file.name, percent);
//         };

//         // Używamy naszej własnej funkcji do obsługi sukcesu dla tego pliku
//         const onSingleFileSuccess = (response) => {
//             if (response && response.compressedImages && response.compressedImages.length > 0) {
//                 const compressedImage = response.compressedImages[0];
//                 this.uiManager.updateTableAfterCompression(
//                     compressedImage.originalName,
//                     compressedImage.compressedSize,
//                     compressedImage.compressionRatio,
//                     compressedImage.imageDownloadURL
//                 );
//             } else {
//                 // Jeśli nie ma danych o skompresowanym obrazie, oznacz jako sukces
//                 this.uiManager.setFileProgressSuccess(file.name);
//             }
//         };

//         // Używamy naszej własnej funkcji do obsługi błędu dla tego pliku
//         const onSingleFileError = (message) => {
//             this.showError(`Błąd dla pliku "${file.name}": ${message}`);
//             this.uiManager.setFileProgressError(file.name, 'Błąd kompresji');
//         };

//         // Używamy naszej własnej funkcji do obsługi zakończenia dla tego pliku
//         const onSingleFileComplete = () => {
//             // Możemy tutaj dodać dodatkową logikę po zakończeniu wysyłania pliku
//         };

//         // Wysyłamy plik z własnymi callbackami
//         this.uploadService.uploadSingleFileWithCallbacks(
//             file,
//             onSingleFileProgress,
//             onSingleFileSuccess,
//             onSingleFileError,
//             onSingleFileComplete
//         );
//     }

//     /**
//      * Wysyłanie partii plików
//      * @param {Array<File>} files - Tablica plików do wysłania
//      */
//     uploadFileBatch(files) {
//         const formData = this.prepareBatchFormData(files);
//         const xhr = new XMLHttpRequest();

//         // Nazwy plików w partii
//         const fileNames = files.map(file => file.name);

//         // Obsługa postępu wysyłania
//         xhr.upload.addEventListener('progress', (event) => {
//             if (event.lengthComputable) {
//                 const batchPercentComplete = Math.round((event.loaded / event.total) * 100);

//                 // Aktualizacja postępu dla wszystkich plików w partii
//                 fileNames.forEach(fileName => {
//                     this.state.totalProgress[fileName] = batchPercentComplete;
//                 });

//                 // Wywołanie callbacka postępu
//                 this.updateTotalProgress();
//             }
//         });

//         // Obsługa zakończenia wysyłania
//         xhr.addEventListener('load', () => {
//             // Zmniejszenie licznika aktywnych wysyłań
//             this.state.activeUploads--;

//             if (xhr.status >= 200 && xhr.status < 300) {
//                 try {
//                     const response = JSON.parse(xhr.responseText);
//                     // Wywołanie callbacka sukcesu
//                     this.onSuccess(response, files);
//                 } catch (error) {
//                     // Wywołanie callbacka błędu
//                     this.onError(`Błąd podczas przetwarzania odpowiedzi dla partii plików. ${error.message}`, files);
//                 }
//             } else {
//                 // Wywołanie callbacka błędu
//                 this.onError(`Błąd serwera dla partii plików: ${xhr.status} ${xhr.statusText}`, files);
//             }

//             // Kontynuuj przetwarzanie kolejki
//             this.processUploadQueue();
//         });

//         // Obsługa błędu wysyłania
//         xhr.addEventListener('error', () => {
//             this.onError(`Błąd połączenia podczas wysyłania partii plików.`, files);
//             this.state.activeUploads--;
//             this.processUploadQueue();
//         });

//         // Obsługa przerwania wysyłania
//         xhr.addEventListener('abort', () => {
//             this.onError(`Wysyłanie partii plików zostało przerwane.`, files);
//             this.state.activeUploads--;
//             this.processUploadQueue();
//         });

//         // Wysłanie żądania
//         xhr.open('POST', this.config.uploadUrl);
//         xhr.send(formData);
//     }

//     /**
//      * Wysyłanie wszystkich plików jednocześnie
//      * @param {Array<File>} files - Tablica plików do wysłania
//      */
//     uploadAllFiles(files) {
//         const formData = this.prepareBatchFormData(files);
//         const xhr = new XMLHttpRequest();

//         // Obsługa postępu wysyłania
//         xhr.upload.addEventListener('progress', (event) => {
//             if (event.lengthComputable) {
//                 const percentComplete = Math.round((event.loaded / event.total) * 100);

//                 // Aktualizacja postępu dla wszystkich plików
//                 files.forEach(file => {
//                     this.state.totalProgress[file.name] = percentComplete;
//                 });

//                 // Wywołanie callbacka postępu
//                 this.onProgress(percentComplete, files);
//             }
//         });

//         // Obsługa zakończenia wysyłania
//         xhr.addEventListener('load', () => {
//             if (xhr.status >= 200 && xhr.status < 300) {
//                 try {
//                     const response = JSON.parse(xhr.responseText);
//                     // Wywołanie callbacka sukcesu
//                     this.onSuccess(response, files);
//                 } catch (error) {
//                     // Wywołanie callbacka błędu
//                     this.onError(`Błąd podczas przetwarzania odpowiedzi serwera. ${error.message}`, files);
//                 }
//             } else {
//                 // Wywołanie callbacka błędu
//                 this.onError(`Błąd serwera: ${xhr.status} ${xhr.statusText}`, files);
//             }

//             // Wywołanie callbacka zakończenia
//             this.onComplete();
//         });

//         // Obsługa błędu wysyłania
//         xhr.addEventListener('error', () => {
//             this.onError('Błąd połączenia z serwerem.', files);
//             this.onComplete();
//         });

//         // Obsługa przerwania wysyłania
//         xhr.addEventListener('abort', () => {
//             this.onError('Wysyłanie zostało przerwane.', files);
//             this.onComplete();
//         });

//         // Wysłanie żądania
//         xhr.open('POST', this.config.uploadUrl);
//         xhr.send(formData);
//     }

//     /**
//      * Przygotowanie danych formularza dla pojedynczego pliku
//      * @param {File} file - Plik do wysłania
//      * @returns {FormData} - Obiekt FormData z danymi pliku
//      */
//     prepareFileFormData(file) {
//         const formData = new FormData();
//         formData.append('image', file);
//         formData.append('filename', file.name);
//         return formData;
//     }

//     /**
//      * Przygotowanie danych formularza dla partii plików
//      * @param {Array<File>} files - Tablica plików do wysłania
//      * @returns {FormData} - Obiekt FormData z danymi plików
//      */
//     prepareBatchFormData(files) {
//         const formData = new FormData();

//         // Dodanie plików do formData
//         files.forEach((file, index) => {
//             formData.append(`image_${index}`, file);
//         });

//         // Dodanie liczby plików
//         formData.append('count', files.length);

//         return formData;
//     }

//     /**
//      * Aktualizacja łącznego postępu wysyłania
//      */
//     updateTotalProgress() {
//         const fileNames = Object.keys(this.state.totalProgress);
//         if (fileNames.length === 0) return;

//         // Obliczenie średniego postępu wszystkich plików
//         const totalProgress = fileNames.reduce((sum, fileName) => {
//             return sum + this.state.totalProgress[fileName];
//         }, 0) / fileNames.length;

//         // Wywołanie callbacka postępu
//         this.onProgress(Math.round(totalProgress), fileNames);
//     }

//     /**
//      * Anulowanie wszystkich aktywnych wysyłek
//      */
//     cancelUploads() {
//         // Ta metoda mogłaby implementować anulowanie aktywnych żądań XHR
//         console.log('Anulowanie wszystkich wysyłek');
//         //TODO:  Implementacja anulowania...
//     } 
 

//     /**
//      * Wysyłanie pojedynczego pliku z monitorowaniem postępu kompresji przez SSE
//      * @param {File} file - Plik do wysłania
//      * @param {Function} onProgress - Callback wywoływany przy aktualizacji postępu
//      * @param {Function} onSuccess - Callback wywoływany przy sukcesie
//      * @param {Function} onError - Callback wywoływany przy błędzie
//      * @param {Function} onComplete - Callback wywoływany po zakończeniu
//      */
//     uploadSingleFileWithCallbacks(file, onProgress, onSuccess, onError, onComplete) {
//         // Przygotowanie danych do wysłania
//         const formData = this.prepareFileFormData(file);
//         const xhr = new XMLHttpRequest();
//         let eventSource = null;

//         // Obsługa postępu wysyłania pliku
//         xhr.upload.addEventListener('progress', (event) => {
//             if (event.lengthComputable) {
//                 // Ograniczamy postęp wysyłania do maksymalnie 20%
//                 const uploadPercentComplete = Math.round((event.loaded / event.total) * 100);
//                 const adjustedPercentComplete = Math.min(uploadPercentComplete / 5, 20); // Maksymalnie 20%

//                 // Wywołanie callbacka z aktualnym postępem wysyłania
//                 onProgress(adjustedPercentComplete);
//             }
//         });

//         // Obsługa zakończenia wysyłania pliku
//         xhr.addEventListener('load', () => {
//             if (xhr.status >= 200 && xhr.status < 300) {
//                 try {
//                     // Parsowanie odpowiedzi JSON
//                     const response = JSON.parse(xhr.responseText);

//                     // Sprawdzenie, czy odpowiedź zawiera identyfikator zadania kompresji
//                     if (!response.processId) {
//                         throw new Error('Brak identyfikatora zadania kompresji w odpowiedzi serwera');
//                     }

//                     // Rozpoczęcie nasłuchiwania na aktualizacje postępu kompresji przez SSE
//                     this.monitorCompressionProgress(
//                         response.processId,
//                         file.name,
//                         onProgress,
//                         onSuccess,
//                         onError,
//                         onComplete
//                     );
//                 } catch (error) {
//                     // Obsługa błędu parsowania odpowiedzi
//                     onError(`Błąd podczas przetwarzania odpowiedzi: ${error.message}`);
//                     onComplete();
//                 }
//             } else {
//                 // Obsługa błędu HTTP
//                 onError(`Błąd serwera: ${xhr.status} ${xhr.statusText}`);
//                 onComplete();
//             }
//         });

//         // Obsługa błędu połączenia
//         xhr.addEventListener('error', () => {
//             onError('Błąd połączenia z serwerem podczas wysyłania pliku.');
//             onComplete();
//         });

//         // Obsługa przerwania wysyłania
//         xhr.addEventListener('abort', () => {
//             onError('Wysyłanie pliku zostało przerwane.');
//             onComplete();
//         });

//         // Wysłanie żądania
//         xhr.open('POST', this.config.uploadUrl);
//         xhr.send(formData);
//     }

//     /**
//      * Monitorowanie postępu kompresji przez Server-Sent Events
//      * @param {string} processId - Identyfikator zadania kompresji
//      * @param {string} fileName - Nazwa pliku
//      * @param {Function} onProgress - Callback wywoływany przy aktualizacji postępu
//      * @param {Function} onSuccess - Callback wywoływany przy sukcesie
//      * @param {Function} onError - Callback wywoływany przy błędzie
//      * @param {Function} onComplete - Callback wywoływany po zakończeniu
//      */
//     monitorCompressionProgress(processId, fileName, onProgress, onSuccess, onError, onComplete) { 
//         // stała TRACK_COMPRESSION_PROGRESS_URL jest zadeklarowana w graphics_tools_module/compressor_panel/index.html.twig
//         const sseUrl = `${TRACK_COMPRESSION_PROGRESS_URL}/${encodeURIComponent(processId)}`;

//         // Zmienna do przechowywania referencji do obiektu EventSource
//         let eventSource = null; 

//         try {
//             // Utworzenie obiektu EventSource do nasłuchiwania na aktualizacje
//             eventSource = new EventSource(sseUrl);

//             // Nasłuchiwanie na domyślne zdarzenia (bez nazwy)
//             eventSource.onmessage = (event) => {
//                 try {
//                     // Parsowanie danych JSON
//                     const data = JSON.parse(event.data);

//                     // Przeliczenie postępu kompresji (20-100%)
//                     // 20% to wysyłanie pliku, 80% to kompresja
//                     const compressionPercent = 20 + (data.progress * 0.8);

//                     // Wywołanie callbacka z aktualnym postępem
//                     onProgress(Math.round(compressionPercent));

//                     // Jeśli kompresja zakończona, zamknij połączenie i wywołaj callback sukcesu
//                     if (data.completed) {
//                         // Zamknięcie połączenia SSE
//                         this.closeEventSource(eventSource);

//                         // Wywołanie callbacka sukcesu z wynikiem kompresji
//                         onSuccess(data.result);

//                         // Wywołanie callbacka zakończenia
//                         onComplete();
//                     }
//                 } catch (error) {
//                     // Obsługa błędu parsowania danych
//                     this.closeEventSource(eventSource);
//                     onError(`Błąd podczas przetwarzania danych postępu: ${error.message}`);
//                     onComplete();
//                 }
//             };

//             // Nasłuchiwanie na nazwane zdarzenie 'progress'
//             eventSource.addEventListener('progress', (event) => {
//                 try {
//                     // Parsowanie danych JSON
//                     const data = JSON.parse(event.data);

//                     // Przeliczenie postępu kompresji (20-100%)
//                     const compressionPercent = 20 + (data.progress * 0.8);

//                     // Wywołanie callbacka z aktualnym postępem
//                     onProgress(Math.round(compressionPercent));
//                 } catch (error) {
//                     console.warn('Błąd podczas przetwarzania zdarzenia progress:', error);
//                 }
//             });

//             // Nasłuchiwanie na nazwane zdarzenie 'completed'
//             eventSource.addEventListener('completed', (event) => {
//                 try {
//                     // Parsowanie danych JSON
//                     const data = JSON.parse(event.data);

//                     // Zamknięcie połączenia SSE
//                     this.closeEventSource(eventSource);

//                     // Wywołanie callbacka sukcesu z wynikiem kompresji
//                     onSuccess(data.result);

//                     // Wywołanie callbacka zakończenia
//                     onComplete();
//                 } catch (error) {
//                     console.warn('Błąd podczas przetwarzania zdarzenia completed:', error);
//                 }
//             });

//             // Nasłuchiwanie na nazwane zdarzenie 'error'
//             eventSource.addEventListener('error_event', (event) => {
//                 try {
//                     // Parsowanie danych JSON
//                     const data = JSON.parse(event.data);

//                     // Zamknięcie połączenia SSE
//                     this.closeEventSource(eventSource);

//                     // Wywołanie callbacka błędu
//                     onError(data.message || 'Błąd podczas kompresji pliku');

//                     // Wywołanie callbacka zakończenia
//                     onComplete();
//                 } catch (error) {
//                     console.warn('Błąd podczas przetwarzania zdarzenia error_event:', error);
//                 }
//             });

//             // Obsługa błędów połączenia SSE
//             eventSource.onerror = (event) => {
//                 // Zamknięcie połączenia SSE
//                 this.closeEventSource(eventSource);

//                 // Wywołanie callbacka błędu
//                 onError('Utracono połączenie z serwerem podczas monitorowania kompresji');

//                 // Wywołanie callbacka zakończenia
//                 onComplete();
//             };
//         } catch (error) {
//             // Obsługa błędu utworzenia obiektu EventSource
//             if (eventSource) {
//                 this.closeEventSource(eventSource);
//             }

//             onError(`Nie można monitorować postępu kompresji: ${error.message}`);
//             onComplete();
//         }
//     }

//     /**
//      * Bezpieczne zamknięcie połączenia EventSource
//      * @param {EventSource} eventSource - Obiekt EventSource do zamknięcia
//      */
//     closeEventSource(eventSource) {
//         if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
//             // Usunięcie wszystkich nasłuchiwaczy zdarzeń
//             eventSource.onmessage = null;
//             eventSource.onerror = null;

//             // Zamknięcie połączenia
//             eventSource.close();
//         }
//     }

// }




// const totalFiles = files.length;
        // const totalSize = files.reduce((sum, file) => sum + file.size, 0);

        // // Jeśli liczba plików jest mała i łączny rozmiar nie przekracza limitu, używamy wysyłania wsadowego
        // if (totalFiles <= this.config.maxBatchSize && totalSize <= this.config.maxBatchSizeBytes) {
        //     this.state.uploadStrategy = 'batch';
        //     console.log('Wybrano strategię: batch upload');
        // } else {
        //     this.state.uploadStrategy = 'queue';
        //     console.log('Wybrano strategię: queue upload');
        // }




        // /**
    //  * Wysyłanie pojedynczego pliku z własnymi callbackami
    //  * @param {File} file - Plik do wysłania
    //  * @param {Function} onProgress - Callback postępu
    //  * @param {Function} onSuccess - Callback sukcesu
    //  * @param {Function} onError - Callback błędu
    //  * @param {Function} onComplete - Callback zakończenia
    //  */
    // uploadSingleFileWithCallbacks(file, onProgress, onSuccess, onError, onComplete) {
    //     const formData = this.prepareFileFormData(file);
    //     const xhr = new XMLHttpRequest();

    //     // Obsługa postępu wysyłania - to pokazuje tylko postęp wysyłania pliku na serwer
    //     xhr.upload.addEventListener('progress', (event) => {
    //         if (event.lengthComputable) {
    //             const uploadPercentComplete = Math.round((event.loaded / event.total) * 100);
    //             const adjustedPercentComplete = Math.min(uploadPercentComplete / 5, 20); // Maksymalnie 20%
    //             onProgress(adjustedPercentComplete);
    //         }
    //     });

    //     // Obsługa zakończenia wysyłania
    //     xhr.addEventListener('load', () => {
    //         if (xhr.status >= 200 && xhr.status < 300) {
    //             try {
    //                 const response = JSON.parse(xhr.responseText);

    //                 // Po otrzymaniu odpowiedzi od serwera, ustawiamy postęp na 100%
    //                 // ponieważ kompresja została zakończona
    //                 onProgress(100);

    //                 // Wywołanie callbacka sukcesu
    //                 onSuccess(response);
    //             } catch (error) {
    //                 onError(`Błąd podczas przetwarzania odpowiedzi: ${error.message}`);
    //             }
    //         } else {
    //             onError(`Błąd serwera: ${xhr.status} ${xhr.statusText}`);
    //         }

    //         onComplete();
    //     });

    //     // Obsługa błędu wysyłania
    //     xhr.addEventListener('error', () => {
    //         onError('Błąd połączenia z serwerem.');
    //         onComplete();
    //     });

    //     // Obsługa przerwania wysyłania
    //     xhr.addEventListener('abort', () => {
    //         onError('Wysyłanie zostało przerwane.');
    //         onComplete();
    //     });

    //     // Wysłanie żądania
    //     xhr.open('POST', this.config.uploadUrl);
    //     xhr.send(formData);
    // }