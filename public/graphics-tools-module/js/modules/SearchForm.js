import { emitEvent } from "../utils/events.js";
import { generateId } from "../utils/generateId.js";

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
    this.initValue = this.getAttribute("data-value") ?? ''
    this.searchAction = this.getAttribute("data-action")
    this.inputName = this.getAttribute("data-input-name") ?? "search"
    this.render();

    if (this.searchAction === null) {
      this.addEvents()
    }
  }

  addEvents() {
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
    inputBox.className = "search-box"

    this.form.className = "search-form"

    if (this.searchAction !== null) {
      this.form.action = this.searchAction
    }

    this.button.className = "search-btn link variant2"
    this.button.type = "submit"
    this.button.innerHTML = `
        <i class="icon fa-solid fa-magnifying-glass"></i>
        <span class="sr-only">Szukaj</span>
      `
    this.input.id = this.dataId
    this.input.type = "search"
    this.input.value = this.initValue
    this.input.name = this.inputName
    this.input.placeholder = "Szukaj"
    this.input.className = "floating-label-control form-control"

    inputBox.append(this.input)
    inputBox.append(inputLabel)
    this.form.append(this.button)
    this.form.append(inputBox)
    this.append(this.form)
  }
}

customElements.define("custom-search-form", SearchForm);