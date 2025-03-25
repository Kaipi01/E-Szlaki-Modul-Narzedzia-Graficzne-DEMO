/** 
 * @param {string} prefix
 * @returns {string} Unikalny identyfikator. 
 */
export function generateId(prefix = "") {
    return prefix + Math.random().toString(36);
}

/**
 * Generuje UUID v4 zgodny z RFC 4122
 * @returns {string} UUID w formacie "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
 */
export function generateUUIDv4() {
    // Generuje losowe liczby hexadecymalne
    const getRandomHex = () => Math.floor(Math.random() * 16).toString(16);
    
    // Generuje losowy segment UUID o określonej długości
    const getRandomSegment = (length) => Array.from({ length }, () => getRandomHex()).join('');
    
    // Tworzy UUID zgodny z wersją 4 i wariantem RFC 4122
    return [
        getRandomSegment(8),
        getRandomSegment(4),
        // Wersja 4 (losowy UUID)
        '4' + getRandomSegment(3),
        // Wariant (bits 6-7 ustawione na 10)
        (8 + Math.floor(Math.random() * 4)).toString(16) + getRandomSegment(3),
        getRandomSegment(12)
    ].join('-');
}