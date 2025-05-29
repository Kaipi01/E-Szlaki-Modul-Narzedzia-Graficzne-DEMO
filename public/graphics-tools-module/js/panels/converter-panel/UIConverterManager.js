"use strict";

import UIManager from "../../components/OperationPanel/UIManager.js";
import { formatFileSize } from "../../utils/file-helpers.js";

export default class UIConverterManager extends UIManager {

  constructor(elements, options = {}) {
    super(elements, options)
  }

  renderTableHead() {
    this.elements.tableHeadRow.innerHTML = `
          <th>Podgląd</th>
          <th>Nazwa pliku</th>
          <th>Format</th>
          <th>Rozmiar</th>
          <th>Rozmiar po konwersji</th>
          <th>Docelowy Format</th>
          <th>Status</th> 
          <th>Akcje</th>                  
        `
  }

  /**
   * Renderowanie informacji o grafcie widoku tabeli
   * @param {File} file - Plik obrazu do wyświetlenia
   * @param {string} formattedSize - Sformatowany rozmiar pliku
   */
  async renderImagesInfoTable(file, formattedSize) {

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const row = document.createElement('tr');
        const selectedFormat = this.options.getSelectedFormat()
        const maxFileNameLength = 20
        const fileNameToDisplay = file.name.length > maxFileNameLength ? (file.name.slice(0, maxFileNameLength) + "...") : file.name
        row.dataset.fileName = file.name;

        if (!selectedFormat || selectedFormat == '') {
          throw new Error('Nie wybrano docelowego formatu!')
        }

        const previewCell = this.createTableCell(`<img src="${event.target.result}" alt="${file.name}" class="preview-image">`, {
          'data-title': 'Podgląd',
          'data-preview-image': ''
        });

        const nameCell = this.createTableCell(fileNameToDisplay, {
          'data-title': 'Nazwa pliku',
          'data-name': ''
        });

        const formatCell = this.createTableCell(
          `<span class="mx-auto badge">${file.type.replace('image/', '').toUpperCase()}</span>`, {
            'data-title': 'Format',
            'data-type': ''
          }
        );

        const progressBarHTML = `
                            <span data-progress-container-${file.name.replace(/[^a-zA-Z0-9]/g, '_')} class="animated-progress animated-progress--no-label">
                                <span class="animated-progress-bar">
                                    <span class="animated-progress-per" data-progress-bar-${file.name.replace(/[^a-zA-Z0-9]/g, '_')} per="0"></span>
                                </span>
                                <span class="animated-progress-info">
                                    <span class="animated-progress-name">Oczekiwanie...</span>
                                    <span class="animated-progress-stats">
                                        <span data-progress-text-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}>0%</span>
                                    </span>
                                </span>
                            </span>
                        `;

        const statusCell = this.createTableCell(progressBarHTML, {
          'data-title': 'Status',
          'data-status': '',
          'data-file-progress': file.name
        });

        const sizeCell = this.createTableCell(formattedSize, {
          'data-title': 'Rozmiar',
          'data-size': ''
        });

        const descFormatCell = this.createTableCell(
          `<span class="mx-auto badge">${selectedFormat.replace('image/', '').toUpperCase()}</span>`, {
            'data-title': 'Docelowy Format',
            'data-type': ''
          }
        );

        const afterSizeCell = this.createTableCell('-', {
          'data-title': 'Rozmiar po konwersji',
          'data-after-size': ''
        });

        const actionsCell = this.createTableCell(`
                            <button class="mx-auto badge image-operation__item-cancel">
                                <i class="fa-solid fa-xmark image-operation__item-cancel-icon"></i> 
                                <span>Anuluj</span>
                            </button>
                        `, {
          'data-title': 'Akcje',
          'data-actions': ''
        });
        const cancelButton = actionsCell.querySelector('button');
        cancelButton.addEventListener('click', () => this.onFileRemove(file.name));

        row.appendChild(previewCell);
        row.appendChild(nameCell);
        row.appendChild(formatCell);
        row.appendChild(sizeCell);
        row.appendChild(afterSizeCell)
        row.appendChild(descFormatCell)
        row.appendChild(statusCell);
        row.appendChild(actionsCell);

        this.elements.imageTable.appendChild(row);
        resolve(row);
      };

      reader.onerror = (error) => reject(error);

      reader.readAsDataURL(file);
    });
  }

  /**
   * Aktualizacja tabeli po operacji
   * @param {object} data - dane
   */
  updateTableAfterOperation(data) {
    const { fileName, afterSize, downloadURL} = data
    const listItem = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);

    if (!listItem) return;

    const actionsCell = listItem.querySelector('[data-actions]');
    const afterSizeCell = listItem.querySelector('[data-after-size]');

    afterSizeCell.innerHTML = `<span class="image-operation__item-compressed-size">${formatFileSize(parseInt(afterSize))}</span>`;
    actionsCell.innerHTML = `
      <a href="${downloadURL}" download class="mx-auto badge image-operation__item-download">
        <i class="fa-solid fa-circle-down image-operation__item-download-icon"></i>
        <span>Pobierz</span>
      </a>
    `; 

    this.setFileProgressSuccess(fileName);
  }
}