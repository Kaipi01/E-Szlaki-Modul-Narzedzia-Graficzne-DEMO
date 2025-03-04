import {fadeAnimation} from '../utils/animations.js'

export default class Alert extends HTMLElement {

    static SUCCESS = "success";
    static WARNING = "warning";
    static ERROR = "error";
    static INFO = "info";
    static SUCCESS_ICON = "fa-circle-check";
    static ERROR_ICON = "fa-circle-exclamation";
    static WARNING_ICON = "fa-triangle-exclamation";
    static INFO_ICON = "fa-circle-info";

    ANIMATION_DURATION = 300

    constructor() {
        super();
    }

    /** 
     * @param {string} type 
     * @param {string} message 
     * @param {HTMLElement} container 
     */
    static show(type, message, container) {
        const alert = document.createElement('custom-alert')

        alert.setAttribute('data-type', type)
        alert.setAttribute('data-message', message)

        container.prepend(alert)
    }

    connectedCallback() {
        this.dataType = this.getAttribute('data-type') ?? Alert.INFO;
        this.dataMessage = this.getAttribute('data-message') ?? '';

        this.render();
        this.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-close-alert-btn')) {
                fadeAnimation(() => this.remove(), this, this.ANIMATION_DURATION)
            }
        })
    }

    render() {
        let iconType

        switch (this.dataType) {
            case Alert.SUCCESS:
                iconType = CustomToast.SUCCESS_ICON;
                break;
            case Alert.ERROR:
                iconType = Alert.ERROR_ICON;
                break;
            case Alert.WARNING:
                iconType = Alert.WARNING_ICON;
                break;
            default:
                iconType = Alert.INFO_ICON;
        }

        this.innerHTML = `
        <div class="alert ${this.dataType}-alert">
          <i class="icon fa-solid ${iconType}"></i>
          <p class="message">${this.dataMessage}</p>
          <button role="button" data-close-alert-btn class="close"><i class="fa-solid fa-xmark"></i></button>
        </div>
      `
    }

}

customElements.define("custom-alert", Alert);