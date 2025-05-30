'use strict';

export default class DropZoneManager {
  /** 
   * @param {HTMLElement} dropZoneElement  
   * @param {(files: FileList) => void} onDrop
   */
  constructor(dropZoneElement, onDrop) {
    this.dropZone = dropZoneElement
    this.onDrop = onDrop

    this.attachEventListeners()
  }

  attachEventListeners() { 

    this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
    this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
    this.dropZone.addEventListener('drop', this.handleDrop.bind(this)); 

    // Zapobieganie domyślnej akcji przeglądarki przy upuszczaniu plików 
    document.addEventListener('dragover', this.preventBrowserDefaults.bind(this));
    document.addEventListener('drop', this.preventBrowserDefaults.bind(this));
  }

  addClass(name) {
    this.dropZone.classList.add(name);
  }

  removeClass(name) {
    this.dropZone.classList.remove(name);
  }

  /** @param {DragEvent} event  */
  handleDrop(event) {
    this.preventBrowserDefaults(event);
    this.removeClass('drag-over');

    const droppedFiles = event.dataTransfer.files;

    if (droppedFiles && droppedFiles.length > 0) {
      this.onDrop(droppedFiles)
    }
  }

  /** Zapobiega domyślnym akcjom przeglądarki */
  preventBrowserDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  /** Obsługa zdarzenia przeciągania plików nad obszarem drop zone */
  handleDragOver(event) {
    this.preventBrowserDefaults(event);
    this.addClass('drag-over');
  }

  /** Obsługa zdarzenia opuszczenia obszaru drop zone podczas przeciągania */
  handleDragLeave(event) {
    this.preventBrowserDefaults(event);
    this.removeClass('drag-over');
  }
}