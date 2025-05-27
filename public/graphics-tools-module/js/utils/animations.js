import { wait } from "./time-utils.js";

/**
 * @param {() => void} callback
 * @param {HTMLElement | NodeListOf<HTMLElement>} elementsToAnimate
 * @param {number} durationInMiliseconds
 */
export async function fadeAnimation(callback, elementsToAnimate, durationInMiliseconds) {
    const isHTMLElement = elementsToAnimate instanceof HTMLElement
    const elements = isHTMLElement ? [elementsToAnimate] : [...elementsToAnimate].filter(el => el != null);

    elements.forEach(el => {
        el.style.transition = `all ${durationInMiliseconds / 1000.0}s ease`
        el.style.opacity = "0"
    })

    return wait(durationInMiliseconds, () => {
        callback()
        elements.forEach(el => el.style.opacity = "1")
    })
}