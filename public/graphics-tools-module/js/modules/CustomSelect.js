export default class CustomSelect {
  static HIDE_VALUE = "hide"
  static NULL_VALUE = "null"
  static CHANGE_OPTION_EVENT = "custom-select-change-option"

  selectElement
  wrapper = null
  isInitialized = true
  numberOfOptions
  className

  /** @param {HTMLSelectElement} selectElement */
  constructor(selectElement) {
    this.selectElement = selectElement;
    this.numberOfOptions = selectElement.children.length;
    this.className = selectElement.dataset.className ?
      selectElement.dataset.className :
      "custom-select";
    this.createCustomElements();
    this.attachEventListeners();
    this.isInitialized = false
    this.isEnabled = true
  }

  /** @param {() => void} callback */
  reRender(callback) {
    this.destroy()
    callback()
    this.numberOfOptions = this.selectElement.children.length;
    this.createCustomElements();
    this.attachEventListeners();
  }

  disabled() {
    this.isEnabled = false
    this.styledSelect.setAttribute('disabled', 'true')
  }

  enabled() {
    this.isEnabled = true
    this.styledSelect.removeAttribute('disabled')
  }

  createCustomElements() {
    this.selectElement.classList.add(`${this.className}-hidden`);
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add(this.className);
    this.selectElement.parentNode.insertBefore(this.wrapper, this.selectElement);
    this.wrapper.appendChild(this.selectElement);
    this.styledSelect = document.createElement("div");
    this.styledSelect.classList.add(`${this.className}-styled`);
    const firstOption = this.selectElement.options[0]
    const firstOptionIcon = firstOption.dataset.icon

    this.styledSelect.innerHTML = `
      ${firstOptionIcon ? `<i class="fa-solid ${firstOptionIcon}"></i>` : ''}
      ${firstOption.textContent}
    `;
    this.wrapper.appendChild(this.styledSelect);
    this.optionList = document.createElement("ul");
    this.optionList.classList.add(`${this.className}-options`);
    this.wrapper.appendChild(this.optionList);
    this.styledSelect.setAttribute("tabindex", "0");

    for (let i = 0; i < this.numberOfOptions; i++) {
      let listItem = document.createElement("li");
      let icon = this.selectElement.options[i].dataset.icon;
      let listItemIcon = icon ? document.createElement("i") : "";
      listItem.textContent = this.selectElement.options[i].textContent;
      listItem.setAttribute("rel", this.selectElement.options[i].value);
      listItem.setAttribute("tabindex", "0");

      if (listItemIcon != "") {
        listItemIcon.classList.add("fa-solid", icon);
      }

      listItem.prepend(listItemIcon);
      this.optionList.appendChild(listItem);

      if (this.selectElement.options[i].selected) {
        listItem.classList.add("is-selected");
      }
    }

    this.listItems = this.optionList.querySelectorAll("li");
  }

  getOptionsListElement() {
    return this.optionList
  }

  getCurrentValue() {
    if (! this.isEnabled) return ''

    const currentSelectedOption = this.optionList.querySelector("li.is-selected")

    return currentSelectedOption.getAttribute("rel")
  }

  /** @param {string | null} value */
  chooseOption(value) {
    const prevSelected = this.optionList.querySelector("li.is-selected")
    let listItem = this.optionList.querySelector(`[rel="${value}"]`)

    if (!listItem) {
      listItem = this.optionList.querySelector(`[rel="${CustomSelect.HIDE_VALUE}"]`)
    }

    this.styledSelect.innerHTML = listItem.innerHTML;
    this.styledSelect.classList.remove("active");
    this.selectElement.value = listItem.getAttribute("rel");

    prevSelected.classList.remove("is-selected");
    listItem.classList.add("is-selected");
    this.optionList.style.display = "none";

    if (!this.isInitialized) {

      this.wrapper.dispatchEvent(new CustomEvent(CustomSelect.CHANGE_OPTION_EVENT, {
        detail: {
          value: value,
          prevValue: prevSelected.getAttribute("rel")
        }
      }))
    }
  };

  /** @param {(e: CustomEvent)=> {}} callback */
  onChangeSelect(callback) {
    this.wrapper.addEventListener(CustomSelect.CHANGE_OPTION_EVENT, e => callback(e))
  }

  openSelect(e) {
    e.stopPropagation()

    if (! this.isEnabled) return

    document
      .querySelectorAll(`div.${this.className}-styled.active`)
      .forEach((activeStyledSelect) => {
        if (activeStyledSelect !== this.styledSelect) {
          activeStyledSelect.classList.remove("active");
          activeStyledSelect.nextElementSibling.style.display = "none";
        }
      });
    this.styledSelect.classList.toggle("active");
    this.optionList.style.display = this.styledSelect.classList.contains("active") ? "block" : "none";
  };

  attachEventListeners() {
    this.styledSelect.addEventListener("click", (e) => this.openSelect(e));
    this.styledSelect.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.openSelect(e);
      }
    }); 

    this.listItems.forEach((listItem) => {
      listItem.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.chooseOption(listItem.getAttribute('rel'));
        }
      });
      listItem.addEventListener("click", () => this.chooseOption(listItem.getAttribute('rel')));
    });

    document.addEventListener("click", () => {
      this.styledSelect.classList.remove("active");
      this.optionList.style.display = "none";
    });
  }

  destroy() {
    const wrapperParent = this.wrapper.parentElement

    this.selectElement.classList.remove(`${this.className}-hidden`);

    wrapperParent.append(this.selectElement)
    this.wrapper.remove()
  }

  /** @param {string} selector */
  static initAll(selector) {
    document
      .querySelectorAll(selector)
      .forEach((selectElement) => {
        new CustomSelect(selectElement);
      });
  }
}
