import { emitEvent } from "../utils/events";
import { generateId } from "../utils/generateId";

export default class SearchForm extends HTMLElement {
    static SEARCH_EVENT = "custom-search-form-search-event"

    constructor() {
        super();
        this.dataId = null
        this.forPanel = null
        this.form = document.createElement('form')
        this.button = document.createElement('button')
        this.input = document.createElement('input')
    }

    connectedCallback() {
        this.dataId = this.getAttribute("data-id") ?? generateId('input-search-');
        this.forPanel = this.getAttribute("data-for-panel")
        this.render();
        this.init()
    }

    init() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault()
            emitEvent(SearchForm.SEARCH_EVENT, {
                value: this.input.value,
                panel: this.forPanel
            })
        })

        this.input.addEventListener('search', (e) => {
            emitEvent(SearchForm.SEARCH_EVENT, {
                value: this.input.value,
                panel: this.forPanel
            })
        })
    }

    render() {
        const inputBox = document.createElement('div')
        const inputLabel = document.createElement('label')

        inputLabel.className = "floating-label"
        inputLabel.setAttribute('for', this.dataId)
        inputLabel.textContent = "Szukaj"
        inputBox.className = "upt-search-box"

        this.form.className = "upt-search-form"

        this.button.className = "upt-search-btn link variant2"
        this.button.type = "submit"
        this.button.innerHTML = `
        <i class="upt-icon fa-solid fa-magnifying-glass"></i>
        <span class="sr-only">Szukaj</span>
      `
        this.input.id = this.dataId
        this.input.type = "search"
        this.input.name = "input-search"
        this.input.placeholder = "Szukaj"
        this.input.className = "floating-label-control upt-form-control"

        inputBox.append(this.input)
        inputBox.append(inputLabel)
        this.form.append(this.button)
        this.form.append(inputBox)
        this.append(this.form)
    }
}

customElements.define("custom-search-form", SearchForm);