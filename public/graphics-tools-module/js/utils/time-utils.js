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
 * Funkcja debounce do ograniczenia częstotliwości wykonywania funkcji
 * @param {Function} func - Funkcja do wykonania
 * @param {number} wait - Czas oczekiwania w ms
 * @returns {Function} Funkcja z debounce
 */
export function debounce(func, wait) {
  let timeout;

  return (...args) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}