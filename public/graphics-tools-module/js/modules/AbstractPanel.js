import ApiService from './ApiService.js'
import Alert from './Alert.js'
import Toast from './Toast.js'

/** @abstract */
export default class AbstractPanel {
    static ERROR_EVENT = "panel-error-occur-event" 
 
    /** @param {HTMLElement | string} container */
    constructor(container) {  
        /** @type {HTMLElement} */
        this.container = container instanceof HTMLElement ? container : document.querySelector(container);
        this.apiService = ApiService.getInstance()  
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
     */
    showError(error, container = null) {
        const message = error instanceof Error ? error.message : error
        const context = container ?? this.container
        const anyErrorAlerts = context.querySelectorAll('.alert.error-alert')

        console.error(error);

        if (anyErrorAlerts.length === 0) {
            Alert.show(Alert.ERROR, message, context)
        }

        Toast.show(Toast.ERROR, message)
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