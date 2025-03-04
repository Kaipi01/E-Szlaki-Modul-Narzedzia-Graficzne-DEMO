import { saveManipulateElement } from "./dom-manipulate";

/** @param {HTMLElement | string} element */
export function showLoading(element) {
    saveManipulateElement(element, element => element.classList.add("loading"));
}

/** @param {HTMLElement | string} element */
export function hideLoading(element) {
    saveManipulateElement(element, (element) => element.classList.remove("loading"));
}