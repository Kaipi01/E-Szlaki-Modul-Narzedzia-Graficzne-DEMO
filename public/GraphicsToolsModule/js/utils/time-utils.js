/** 
 * @param {number} ms 
 * @param {() => {}} callback
 */
export async function wait(ms, callback = () => {}) {
    return new Promise(resolve => setTimeout(() => {
        callback()
        resolve()
    }, ms));
}

/**
 * Mechanizm throttle do zabezpieczenia animacji
 * @returns {(...args: any[]) => void}
 * @param {Function} callback
 * @param {number} delay
 */
export function throttle(callback, delay) {
    let shouldWait = false;

    return (...args) => {
        if (shouldWait) return;

        callback(...args);
        shouldWait = true;

        setTimeout(() => {
            shouldWait = false;
        }, delay);
    };
};

/**
 * Mechanizm debounce do zabezpieczenia animacji
 * @returns {(...args: any[]) => void}
 * @param {Function} func
 * @param {number} wait
 */
export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};