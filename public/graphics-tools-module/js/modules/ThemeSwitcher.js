export default class ThemeSwitcher extends HTMLElement {
    static NAME = "theme-switcher"
    static THEME_ITEM_NAME = "theme-mode"
    static THEME_DARK = "theme-dark"
    static THEME_LIGHT = "theme-light"

    constructor() {
        super()
        this.labelEl = document.createElement('label')
        this.checkboxEl = document.createElement('input')
        this.dataId = null
    }

    setThemeMode(themeMode) {
        const body = document.body;
        const isThemeDark = themeMode === ThemeSwitcher.THEME_DARK
        const themeToRemove = isThemeDark ? ThemeSwitcher.THEME_LIGHT : ThemeSwitcher.THEME_DARK
        body.classList.add(themeMode);
        body.classList.remove(themeToRemove);
        this.checkboxEl.setAttribute('data-theme-mode', themeMode)
        this.checkboxEl.checked = isThemeDark

        localStorage.setItem(ThemeSwitcher.THEME_ITEM_NAME, themeMode)

        document.cookie = `theme=${themeMode};path=/`;
    }

    init() {
        const mediaQueryPrefersColorDark = window.matchMedia('(prefers-color-scheme: dark)')
        const themeMode = localStorage.getItem(ThemeSwitcher.THEME_ITEM_NAME)
        const darkMode = mediaQueryPrefersColorDark.matches

        if (themeMode) {
            this.setThemeMode(themeMode)
        } else {
            this.setThemeMode(darkMode ? ThemeSwitcher.THEME_DARK : ThemeSwitcher.THEME_LIGHT)
        }

        this.checkboxEl.addEventListener("change", e => {
            this.setThemeMode(
                this.checkboxEl.getAttribute('data-theme-mode') === ThemeSwitcher.THEME_DARK ? ThemeSwitcher.THEME_LIGHT : ThemeSwitcher.THEME_DARK
            )
        });
    }

    connectedCallback() {
        this.dataId = this.getAttribute('data-id')
        this.render()
        this.init()
    }

    render() {
        const decorationContent = document.createElement('div')
        decorationContent.className = "slider"
        decorationContent.innerHTML = `
            <div class="sun"></div>
            <div class="moon"></div>
            <div class="cloud cloud1"></div>
            <div class="cloud cloud2"></div>
            <div class="star star1"></div>
            <div class="star star2"></div>
            <div class="star star3"></div>
            <div class="star star4"></div>
            <div class="star star5"></div>
      `
        this.labelEl.className = ThemeSwitcher.NAME
        this.checkboxEl.id = this.dataId
        this.checkboxEl.type = "checkbox"
        this.labelEl.append(this.checkboxEl)
        this.labelEl.append(decorationContent)
        this.append(this.labelEl)
    }
}

customElements.define(ThemeSwitcher.NAME, ThemeSwitcher)