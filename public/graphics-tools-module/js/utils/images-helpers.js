/** @param {HTMLElement} container */
export function waitForImages(container) {
    const images = container.querySelectorAll('img');

    if (images.length === 0) {
        return Promise.resolve()
    }

    const promises = Array.from(images).map(img => {
        if (img.complete) {
            return new Promise(resolve => requestAnimationFrame(resolve));
        }
        return new Promise(resolve => {
            img.addEventListener('load', () => requestAnimationFrame(resolve));
            img.addEventListener('error', () => requestAnimationFrame(resolve));
        });
    });
    return Promise.all(promises);
}