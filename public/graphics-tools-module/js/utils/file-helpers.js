/**
 * Formatowanie rozmiaru pliku do czytelnej postaci
 * @param {number} bytes - Rozmiar w bajtach
 * @returns {string} - Sformatowany rozmiar z jednostką
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/** 
 * @param {string} url 
 * @param {Object} payload  
 * @param {string} fileNameAfterDownload  
 */
export async function downloadAjaxFile(url, payload = {}, fileNameAfterDownload = '') {

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw new Error(`Błąd pobierania: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = downloadUrl; 
    a.setAttribute('download', fileNameAfterDownload)
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
}