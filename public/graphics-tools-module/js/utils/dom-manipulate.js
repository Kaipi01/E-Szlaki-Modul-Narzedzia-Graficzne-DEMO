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