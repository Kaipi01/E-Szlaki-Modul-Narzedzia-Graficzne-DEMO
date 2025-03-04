/** 
 * @param {string} prefix
 * @returns {string} Unikalny identyfikator. 
 */
export function generateId(prefix = "") {
    return prefix + Math.random().toString(36);
}