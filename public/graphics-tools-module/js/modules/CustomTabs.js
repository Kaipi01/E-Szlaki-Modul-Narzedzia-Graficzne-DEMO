import { emitEvent } from "../utils/events.js";

export default class CustomTabs {
  static TAB_CHANGE_EVENT = "custom-tab-change-event"

  /** @param {HTMLElement} container */
  constructor(container) {
    this.container = container
    this.tabButtons = container.querySelectorAll(`[data-tab-button]`);
    this.tabPanels = container.querySelectorAll(`[data-tab-panel]`);
    this.handleTabClick = this.handleTabClick.bind(this);
    this.handleKeyboard = this.handleKeyboard.bind(this);
    this.isInitialized = false

    if (this.tabPanels.length === 0) {
        console.error('CustomTabs.constructor(): data-tab-panel attributes not found!')
    }

    this.init();
  }

  /** @param {HTMLElement} container */
  static initAll(container) {
    const tabsContents = container.querySelectorAll('[data-tab-content]')

    tabsContents.forEach(content => new CustomTabs(content))
  }

  init() {
    this.tabButtons.forEach(button => {
      button.addEventListener('click', this.handleTabClick);
      button.addEventListener('keydown', this.handleKeyboard);
    });
    this.setActiveTab(this.tabButtons[0]);
  }

  handleTabClick(event) {
    const clickedTab = event.currentTarget;
    this.setActiveTab(clickedTab);
  }

  handleKeyboard(event) {
    const targetTab = event.currentTarget;
    const tabArray = Array.from(this.tabButtons);
    const index = tabArray.indexOf(targetTab);
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.setActiveTab(tabArray[index - 1] || tabArray[tabArray.length - 1]);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.setActiveTab(tabArray[index + 1] || tabArray[0]);
        break;
      case 'Home':
        event.preventDefault();
        this.setActiveTab(tabArray[0]);
        break;
      case 'End':
        event.preventDefault();
        this.setActiveTab(tabArray[tabArray.length - 1]);
        break;
    }
  }

  async setActiveTab(newTab) {
    if (!newTab || newTab.classList.contains('active')) return;

    const newPanelId = newTab.getAttribute('aria-controls');
    const newPanel = this.container.querySelector('#' + newPanelId); 
    const currentPanel = this.container.querySelector(`[data-tab-panel].active`);

    if (currentPanel) {
      currentPanel.style.opacity = '0';
      await this.wait(300);
      currentPanel.classList.remove('active');
    }

    this.tabButtons.forEach(tab => {
      const isNewTab = tab === newTab;
      tab.classList.toggle('active', isNewTab);
      tab.setAttribute('aria-selected', isNewTab);
      tab.setAttribute('tabindex', isNewTab ? '0' : '-1');
    });

    if (newPanel) {
      newPanel.classList.add('active');
      newPanel.offsetHeight;
      newPanel.style.opacity = '1';
    }
    newTab.focus();

    if (this.isInitialized) {
      emitEvent(CustomTabs.TAB_CHANGE_EVENT, {
        tab: newTab.getAttribute('aria-controls')
      })
    }

    this.isInitialized = true
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
