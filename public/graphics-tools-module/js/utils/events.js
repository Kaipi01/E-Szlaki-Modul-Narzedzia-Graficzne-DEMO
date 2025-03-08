/**
 * @param {string} eventName
 * @param {object} eventData
 */
export function emitEvent(eventName, eventData = {}, element = null) {
    const context = element || document

    context.dispatchEvent(
        new CustomEvent(eventName, {
            detail: eventData,
        })
    );
}