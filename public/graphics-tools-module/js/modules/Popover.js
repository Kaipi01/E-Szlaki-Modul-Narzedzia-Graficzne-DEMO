export default class Popover extends HTMLElement {

    dataClass
    dataButtonClass
    dataContentClass
    content
    button
    isOpen = false

    constructor() {
        super()
    }

    connectedCallback() {
        const buttonTextTemplate = this.querySelector(`[slot="button-text"]`)
        const contentTemplate = this.querySelector(`[slot="content"]`)

        this.dataClass = this.getAttribute("data-class") ?? "";
        this.contentVal = contentTemplate?.innerHTML || "";
        this.buttonTextVal = buttonTextTemplate?.innerHTML || "";
        this.dataButtonClass = buttonTextTemplate.getAttribute("data-class") ?? "";
        this.dataContentClass = contentTemplate.getAttribute("data-class") ?? "";
        this.render();
        this.init();
    }

    init() {
        this.content = this.querySelector('[data-popover-content]')
        this.button = this.querySelector('[data-popover-button]')

        this.content.style.display = "none"

        this.button.addEventListener('click', (e) => {
            if (!this.isOpen) {
                this.show()
            } else {
                this.hide()
            }
        })

        document.addEventListener('click', (e) => {
            const isNotThisContent = !e.target.closest('[data-popover-content]')

            if (this.isOpen && e.target !== this.button && isNotThisContent) {
                this.hide()
            }
        })
    }

    show() {
        this.content.style.display = "block"
        this.button.classList.add('active')
        this.isOpen = true
    }
    hide() {
        this.content.style.display = "none"
        this.button.classList.remove('active')
        this.isOpen = false
    }

    render() {
        this.innerHTML = `
      <div data-custom-popover class="custom-popover ${this.dataClass}">
        <button role="button" data-popover-button class="custom-popover-button ${this.dataButtonClass}">
          ${this.buttonTextVal}
        </button>

        <div data-popover-content class="custom-popover-content ${this.dataContentClass}" role="dialog">
          ${this.contentVal}
        </div>
      </div>
    `
    }
}
customElements.define("custom-popover", Popover);