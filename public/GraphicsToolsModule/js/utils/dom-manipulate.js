/**
 * @param {HTMLElement | string} element
 * @param {(element: HTMLElement) => void} callback
 */
export function saveManipulateElement(element, callback) {
    if (typeof element === "string") {
        let selector = element;
        element = document.querySelector(selector);
    }

    if (element && element instanceof HTMLElement) {
        callback(element);
    } else {
        console.error("element don't exist !")
    }
}

/** @param {HTMLElement | null} element */
export function hideElement(element) {
    if (!element) return

    element.style.visibility = "hidden"
    element.classList.add('sr-only')
    element.setAttribute('aria-hidden', 'true')
}

/** @param {HTMLElement | null} element */
export function showElement(element) {
    if (!element) return

    element.style.removeProperty('visibility')
    element.classList.remove('sr-only')
    element.removeAttribute('aria-hidden')
}