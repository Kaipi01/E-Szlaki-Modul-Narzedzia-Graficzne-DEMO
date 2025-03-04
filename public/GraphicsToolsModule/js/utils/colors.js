/**
 * Konwertuje kolor do tablicy RGB [r, g, b]
 * @param {string} color 
 * @returns {number[] | null}
 */
export function getRGBValues(color) {
    if (color.startsWith('#')) {
        if (color.length === 4) {
            color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        return [
            parseInt(color.substring(1, 2), 16),
            parseInt(color.substring(3, 2), 16),
            parseInt(color.substring(5, 2), 16)
        ];
    } else if (color.startsWith('rgb')) {
        const rgb = color.match(/\d+/g);
        if (!rgb) return null;
        return rgb.map(val => parseInt(val, 10));
    }
    return null;
}

/**
 * Konwertuje wartości RGB do formatu hex
 * @param {number[]} rgb 
 * @returns {string}
 */
export function rgbToHex(rgb) {
    return '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Konwertuje wartości RGB do formatu rgb/rgba
 * @param {number[]} rgb 
 * @param {number} [opacity] 
 * @returns {string}
 */
export function rgbToString(rgb, opacity = null) {
    return opacity !== null ?
        `rgba(${rgb.join(', ')}, ${opacity})` :
        `rgb(${rgb.join(', ')})`;
}

/** @param {string} color */
export function invertColor(color) {
    const rgb = getRGBValues(color);
    if (!rgb) return color;

    const inverted = rgb.map(val => 255 - val);

    return color.startsWith('#') ?
        rgbToHex(inverted) :
        rgbToString(inverted);
}

/** 
 * @param {string} color 
 * @param {number} opacity - wartość od 0 do 1
 * @returns {string}
 */
export function setColorOpacity(color, opacity) {
    opacity = Math.max(0, Math.min(1, opacity));

    if (color.startsWith('rgba')) {
        return color.replace(/[\d.]+\)$/g, `${opacity})`);
    }

    const rgb = getRGBValues(color);
    if (!rgb) return color;

    return rgbToString(rgb, opacity);
}