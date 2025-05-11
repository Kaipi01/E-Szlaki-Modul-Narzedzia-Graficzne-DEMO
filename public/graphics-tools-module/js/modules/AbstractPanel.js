import Alert from './Alert.js'
import Toast from './Toast.js'

/** @abstract */
export default class AbstractPanel {
    static ERROR_EVENT = "panel-error-occur-event" 
 
    /** @param {HTMLElement | string} container */
    constructor(container) {  
        /** @type {HTMLElement} */
        this.container = container instanceof HTMLElement ? container : document.querySelector(container);
        this.panelName = null 
        
        document.addEventListener(AbstractPanel.ERROR_EVENT, (e) => {
            const {
                error,
                panel,
                element
            } = e.detail

            if (panel === this.panelName) {
                this.showError(error, element)
            }
        }) 
    }  

    /** 
     * @final
     * @param {Error | string} error 
     * @param {HTMLElement | null} container
     * @param {string | null} type
     */
    showError(error, container = null, type = "ERROR") {
        const message = error instanceof Error ? error.message : error
        const context = container ?? this.container

        if (type === "ERROR") {
            console.error(error);
        } else {
            console.warn(error);
        }  

        Alert.show(Alert[type], message, context)

        Toast.show(Toast[type], message)
    }

    /** 
     * @final
     * @param {string} attrName 
     */
    getByAttribute(attrName) {
        const element = this.container.querySelector(`[${attrName}]`)

        if (!element) {
            console.error(`element[${attrName}] is null!`);
        }

        return element
    }
}