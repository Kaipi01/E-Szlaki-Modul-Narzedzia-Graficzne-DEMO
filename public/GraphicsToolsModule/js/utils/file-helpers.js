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