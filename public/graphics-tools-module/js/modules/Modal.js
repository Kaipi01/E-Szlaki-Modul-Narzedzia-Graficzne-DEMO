import { emitEvent } from "../utils/events.js";

export default class Modal extends HTMLElement {
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

  /** @param {string} modalId */
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
    emitEvent(Modal.HIDE_EVENT_NAME, { modalId: modalId });
  }

  /** @param {string} modalId */
  static show(modalId) {
    emitEvent(Modal.SHOW_EVENT_NAME, { modalId });
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
              <svg class="modal__close-btn-icon" aria-hidden="true" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" xml:space="preserve" fill="#000000">
                <g id="SVGRepo_bgCarrier" stroke-width="0"/>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"/>
                <g id="SVGRepo_iconCarrier"> <style type="text/css"> .pictogram_een{fill:#000;} .pictogram_drie{fill:#47ff85;} .pictogram_vier{fill:#18f73d;} .st0{fill:#000;} .st1{fill:#000;} .st2{fill:#000;} .st3{fill:none;} </style> <g> <circle class="pictogram_vier" cx="16" cy="16" r="13"/> <path class="pictogram_drie" d="M16,3v26c7.18,0,13-5.82,13-13C29,8.82,23.18,3,16,3z"/> <path class="pictogram_een" d="M16,3c7.168,0,13,5.832,13,13s-5.832,13-13,13S3,23.168,3,16S8.832,3,16,3 M16,0 C7.163,0,0,7.163,0,16s7.163,16,16,16s16-7.163,16-16S24.837,0,16,0L16,0z M18.121,16l2.475-2.475c0.586-0.585,0.586-1.536,0-2.121 c-0.586-0.586-1.535-0.586-2.121,0L16,13.879l-2.475-2.475c-0.586-0.586-1.535-0.586-2.121,0c-0.586,0.585-0.586,1.536,0,2.121 L13.879,16l-2.475,2.475c-0.586,0.585-0.586,1.536,0,2.121c0.293,0.293,0.677,0.439,1.061,0.439s0.768-0.146,1.061-0.439L16,18.121 l2.475,2.475c0.293,0.293,0.677,0.439,1.061,0.439s0.768-0.146,1.061-0.439c0.586-0.585,0.586-1.536,0-2.121L18.121,16z"/> </g> </g>
              </svg>
            </button>
          </div>
          ${this.modalContentVal}
        </div> 
      `;
    this.append(this.modalDialog)
  }
}

customElements.define("custom-modal", Modal); 