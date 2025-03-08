/** @param {string | null} dateStr */
export function getFullDate(dateStr) {
    if (!dateStr || dateStr === '') return ''

    const getPad = (number) => number.toString().padStart(2, "0")

    const date = new Date(dateStr)
    const day = getPad(date.getDate())
    const month = getPad(date.getMonth() + 1)
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
}

/** @param {string | null} dateStr */
export function getFullDateAndHoursAndMinutes(dateStr) {
    if (!dateStr || dateStr === '') return ''

    const getPad = (number) => number.toString().padStart(2, "0")

    const date = new Date(dateStr)
    const hours = getPad(date.getHours())
    const minutes = getPad(date.getMinutes())
    return `${getFullDate(dateStr)} | ${hours}:${minutes}`
}