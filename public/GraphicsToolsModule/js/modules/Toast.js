import { GRAPHICS_TOOLS_MODULE } from "../utils/constants.js";
import { generateId } from "../utils/generateId.js";

export default class Toast {
  static CONTAINER_ID = "custom-module-toast-container"

  static SUCCESS = "success";
  static WARNING = "warning";
  static ERROR = "error";
  static INFO = "info";
  static SUCCESS_ICON = "fa-circle-check";
  static ERROR_ICON = "fa-circle-exclamation";
  static WARNING_ICON = "fa-triangle-exclamation";
  static INFO_ICON = "fa-circle-info";

  TIMER_DURATION = 6000
  TIMER_ANIMATION_DURATION = 300

  toastId = '';
  toast;
  countdown;

  /**
   * @param {string} type
   * @param {string} message
   */
  static show(type, message = "") {
    const toast = new Toast()
    toast.open(type, message);
  }

  static cache = {
    context: null,
    container: null
}

  constructor() {
    let context = Toast.cache.context 
    let container = Toast.cache.container

    if (! context) {
      context = document.querySelector(`#${GRAPHICS_TOOLS_MODULE.ID}`);
      Toast.cache.context = context
    }
    if (! container) {
      container = context.querySelector(`#${Toast.CONTAINER_ID}`);
      Toast.cache.container = container
    }

    this.container = container

    if (!this.container) {
      this.container = document.createElement('div')
      this.container.className = "toast-container"
      this.container.id = Toast.CONTAINER_ID
      context.append(this.container)
    }
    this.toastId = generateId("custom-toast-");
    this.init();
  }

  init() {
    this.toast = this.generateToast();
    this.toastTimer = this.toast.querySelector(".timer");
    this.closeToastBtn = this.toast.querySelector(".toast-close");
    this.toastIcon = this.toast.querySelector(".icon");
    this.toastTitle = this.toast.querySelector(".toast-message-title");
    this.toastMessage = this.toast.querySelector(".toast-message-text");

    if (this.closeToastBtn)
      this.closeToastBtn.addEventListener("click", () => this.close());
  }

  /** @returns {HTMLDivElement} */
  generateToast() {
    const toast = document.createElement("div");

    toast.className = "toast";
    toast.id = String(this.toastId);
    toast.style.display = "none";
    toast.innerHTML = ` 
        <i class="icon fa-solid"></i>
        <div class="toast-message">
          <p class="toast-message-title"></p>
          <p class="toast-message-text"></p>
        </div>
        <button role="button" class="toast-close"><span class="sr-only">Zamknij</span></button>
        <div class="timer"></div>
      `;

    this.container.append(toast);

    return toast;
  }

  close() {
    this.toast.style.animation = `close ${this.TIMER_ANIMATION_DURATION / 1000.0}s cubic-bezier(.87,-1,.57,.97) forwards`;
    this.toastTimer.classList.remove("timer-animation");

    clearTimeout(this.countdown);

    setTimeout(() => {
      this.toast.style.display = "none";
      this.toast.remove();

    }, this.TIMER_ANIMATION_DURATION);
  }

  /**
   * @param {string} type
   * @param {string} message
   */
  open(type, message = "") {
    if (this.toast.style.display != "none") return;

    let toastTitle;
    let toastIcon;
    this.toast.classList.remove(Toast.SUCCESS, Toast.WARNING, Toast.ERROR, Toast.INFO);
    this.toastIcon.classList.remove(Toast.SUCCESS_ICON, Toast.WARNING_ICON, Toast.ERROR_ICON, Toast.INFO_ICON);
    this.toast.style.removeProperty('display')

    switch (type) {
      case Toast.SUCCESS:
        toastTitle = "Sukces!";
        toastIcon = Toast.SUCCESS_ICON;
        break;
      case Toast.ERROR:
        toastTitle = "Niepowodzenie!";
        toastIcon = Toast.ERROR_ICON;
        break;
      case Toast.WARNING:
        toastTitle = "Ostrzeżenie";
        toastIcon = Toast.WARNING_ICON;
        break;
      default:
        toastTitle = "Informacja";
        toastIcon = Toast.INFO_ICON;
    }

    this.toastTitle.textContent = toastTitle;
    this.toastMessage.textContent = message;
    this.toastIcon.classList.add(toastIcon);
    this.toast.classList.add(type);
    this.toast.style.animation = `open ${this.TIMER_ANIMATION_DURATION / 1000.0}s cubic-bezier(.47,.02,.44,2) forwards`;
    this.toastTimer.classList.add("timer-animation");

    clearTimeout(this.countdown);

    this.countdown = setTimeout(() => this.close(), this.TIMER_DURATION);
  }
}
 