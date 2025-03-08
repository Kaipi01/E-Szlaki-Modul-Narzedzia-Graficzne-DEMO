import { emitEvent } from "../utils/events";

export class Modal extends HTMLElement {
    static SHOW_EVENT_NAME = "custom-show-modal";
    static HIDE_EVENT_NAME = "custom-hide-modal";
    static START_LOADING_EVENT_NAME = "custom-start-loading-modal";
    static STOP_LOADING_EVENT_NAME = "custom-stop-loading-modal";

    SLOT_TITLE = "modal-title";
    SLOT_CONTENT = "modal-content";
    ATTR_ID = "data-modal-id";
    ATTR_FIRST_FOCUS = "data-modal-first-focus";
    ATTR_CONTENT_CLASS = "data-modal-content-class";
    ATTR_TITLE = "data-modal-title";
    ATTR_CLOSE_BTN = "data-close-btn";
    ATTR_CONTENT = "data-modal-content";

    constructor() {
        super();
        this.modalDialog = document.createElement('dialog')
    }

    static cache = {
        modals: new Map(), 
    }

    /**  @param {string} modalId */
    static showLoading(modalId) {
        emitEvent(Modal.START_LOADING_EVENT_NAME, {
            modalId: modalId,
        });
    }

    /**  @param {string} modalId */
    static hideLoading(modalId) {
        emitEvent(Modal.STOP_LOADING_EVENT_NAME, {
            modalId: modalId
        });
    }

    /**  @param {string} modalId */
    static get(modalId) {
        const modalsCache = Modal.cache.modals
        let modal

        if (modalsCache.has(modalId)) {
            modal = modalsCache.get(modalId)
        } else {
            modal = document.querySelector(`#${modalId}`);
            if (modal) modalsCache.set(modalId, modal)
        }

        return modal
    }

    /**  @param {string} modalId */
    static hide(modalId) {
        emitEvent(Modal.HIDE_EVENT_NAME, {
            modalId: modalId,
        });
    }  

    /**
     * @param {string} modalId
     * @param {string | null} title
     */
    static show(modalId, title = null) {
        const modal = Modal.get(modalId);
        const modalTitleAttr = modal?.querySelector(`[${Modal.ATTR_TITLE}]`);

        if (modalTitleAttr && title) {
            modalTitleAttr.textContent = title;
        }

        emitEvent(Modal.SHOW_EVENT_NAME, {
            modalId
        });
    } 

    connectedCallback() {
        this.modalId = this.getAttribute(this.ATTR_ID);
        this.modalTitle = this.querySelector(`[slot="${this.SLOT_TITLE}"]`);
        this.modalTitleVal = this.modalTitle?.innerHTML || "";
        this.modalContentVal = this.querySelector(`[slot="${this.SLOT_CONTENT}"]`)?.innerHTML || "";
        this.modalContentClass = this.getAttribute(this.ATTR_CONTENT_CLASS);
        this.modalContentClassVal = this.modalContentClass ?? "";

        this.render();
        this.setEvents();
    }

    setEvents() {
        const modalContent = this.querySelector(`[${this.ATTR_CONTENT}]`)
        const handleEvent = (e, callback) => {
            if (e.detail.modalId === this.modalId) {
                callback()
            }
        }

        window.addEventListener("keydown", (event) => {

            if (event.key && event.key.toLowerCase() == "escape") {
                event.preventDefault()
                this.closeModal();
            }
        });

        this.addEventListener('click', (e) => {
            if (e.target.hasAttribute(this.ATTR_CLOSE_BTN) || e.target === this.modalDialog) {
                this.closeModal()
            }
        })

        document.addEventListener(Modal.START_LOADING_EVENT_NAME, (e) => handleEvent(e, () => {
            modalContent.classList.add('loading')
        }))
        document.addEventListener(Modal.STOP_LOADING_EVENT_NAME, (e) => handleEvent(e, () => {
            modalContent.classList.remove('loading')
        }))
        document.addEventListener(Modal.HIDE_EVENT_NAME, (e) => handleEvent(e, () => this.closeModal()))
        document.addEventListener(Modal.SHOW_EVENT_NAME, (e) => handleEvent(e, () => {
            document.body.style.overflowY = "hidden"
            this.modalDialog.showModal()
        }))
    }

    closeModal() {
        this.modalDialog.setAttribute("closing", "");

        this.modalDialog.addEventListener("animationend", () => {
            this.modalDialog.removeAttribute("closing");
            this.modalDialog.close();

            document.body.style.overflowY = "auto"
        }, {
            once: true
        });
    }

    render() {
        this.modalDialog.id = this.modalId
        this.modalDialog.className = "modal"
        this.modalDialog.innerHTML = ` 
        <div ${this.ATTR_CONTENT} class="modal__content modern-card ${this.modalContentClassVal}">
          <div class="modal__header pb-2">
            <p ${this.ATTR_TITLE} id="${this.modalId}-title" class="sr-only">
              ${this.modalTitleVal}
            </p>
            <button role="button" ${this.ATTR_CLOSE_BTN} class="modal__close-btn modal__close-btn--inner">
              <span class="sr-only">Zamknij</span>
              <img class="modal__close-btn-icon" src="./images/close-icon.svg" alt="x" aria-hidden="true">
            </button>
          </div>
          ${this.modalContentVal}
        </div> 
      `;
        this.append(this.modalDialog)
    }
}

customElements.define("custom-modal", Modal);