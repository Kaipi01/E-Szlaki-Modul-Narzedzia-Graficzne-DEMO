console.log('hello converter-panel!')

monitorSSETest()

function monitorSSETest() {

    const sseUrl = `/profil/sse/test`;

    const body = document.body.querySelector('#graphics-tools-module .container')
    const onProgress = (value) => console.log("Progress: ", value)
    const errorHandler = (errorMessage) => console.error(errorMessage)

    let eventSource = null;

    try {
        eventSource = new EventSource(sseUrl);

        console.log('Utworzono EventSource dla URL:', sseUrl);

        eventSource.onopen = (event) => {
            console.log('Połączenie SSE otwarte:', event);
        }; 

        eventSource.addEventListener('completed', (event) => {
            try { 
                closeEventSource(eventSource); 
                console.log("Sukces!!!") 
            } catch (error) {
                errorHandler(`Błąd podczas przetwarzania zdarzenia completed: ${error.message}`);
            }
        });

        eventSource.addEventListener('timeout', (event) => {
            try { 
                closeEventSource(eventSource);
                errorHandler(event.data || 'Timeout podczas kompresji pliku');

            } catch (error) {
                errorHandler(`Błąd podczas przetwarzania zdarzenia timeout: ${error.message}`);
            }
        });

        eventSource.addEventListener('error', (event) => {
            try { 
                closeEventSource(eventSource);
                errorHandler(event.data || 'Błąd podczas kompresji pliku');

            } catch (error) {
                errorHandler(`Błąd podczas przetwarzania zdarzenia error: ${error.message}`);
            }
        });

        eventSource.onmessage = (event) => {
            console.log('Otrzymano wiadomość SSE:', event);

            try { 
                const progressInfo = document.createElement('span')

                onProgress(event.data);  
                progressInfo.textContent = event.data + " "
                body.appendChild(progressInfo)
            } catch (error) {
                errorHandler(`Błąd podczas przetwarzania zdarzenia progress: ${error.message}`);
            }
        };

        eventSource.onerror = (event) => {
            closeEventSource(eventSource);
            errorHandler('Utracono połączenie z serwerem');
        };

    } catch (error) {
        if (eventSource) {
            closeEventSource(eventSource);
        }
        errorHandler(`Nie można monitorować postępu: ${error.message}`);
    }
}


function closeEventSource(eventSource) {
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
        // Usunięcie wszystkich nasłuchiwaczy zdarzeń
        eventSource.onmessage = null;
        eventSource.onerror = null;

        // Zamknięcie połączenia
        eventSource.close();
    }
}