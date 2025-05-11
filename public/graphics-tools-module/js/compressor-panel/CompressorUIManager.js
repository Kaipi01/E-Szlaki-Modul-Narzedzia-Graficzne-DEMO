import UIManager from "../components/OperationPanel/UIManager.js";
import { formatFileSize } from "../utils/file-helpers.js";

export default class CompressorUIManager extends UIManager {
  constructor(elements, options = {}) {
    super(elements, options)
  }

  renderTableHead() {
    this.elements.tableHeadRow.innerHTML = `
      <th>Podgląd</th>
      <th>Nazwa pliku</th>
      <th>Format</th>
      <th>Rozmiar</th>
      <th>Rozmiar po kompresji</th>
      <th>Poziom kompresji</th> 
      <th>Status</th> 
      <th>Akcje</th>                  
    `
  }

  /**
   * Renderowanie miniatury obrazu w widoku tabeli
   * @param {File} file - Plik obrazu do wyświetlenia
   * @param {string} formattedSize - Sformatowany rozmiar pliku
   */
  async renderImagesInfoTable(file, formattedSize) {

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const row = document.createElement('tr');
        const maxFileNameLength = 20
        const fileNameToDisplay = file.name.length > maxFileNameLength ? (file.name.slice(0, maxFileNameLength) + "...") : file.name
        row.dataset.fileName = file.name;

        const previewCell = this.createTableCell(`<img src="${event.target.result}" alt="${file.name}" class="preview-image">`, {
          'data-title': 'Podgląd',
          'data-preview-image': ''
        });

        const nameCell = this.createTableCell(fileNameToDisplay, {
          'data-title': 'Nazwa pliku',
          'data-name': ''
        });

        const typeCell = this.createTableCell(
          `<span class="mx-auto badge">${file.type.replace('image/', '').toUpperCase()}</span>`, {
            'data-title': 'Typ',
            'data-type': ''
          }
        );

        const progressBarHTML = `
                        <div data-progress-container-${file.name.replace(/[^a-zA-Z0-9]/g, '_')} class="animated-progress animated-progress--no-label">
                            <div class="animated-progress-bar">
                                <div class="animated-progress-per" data-progress-bar-${file.name.replace(/[^a-zA-Z0-9]/g, '_')} per="0"></div>
                            </div>
                            <div class="animated-progress-info">
                                <div class="animated-progress-name">Oczekiwanie...</div>
                                <div class="animated-progress-stats">
                                    <span data-progress-text-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}>0%</span>
                                </div>
                            </div>
                        </div>
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

        const compressedSizeCell = this.createTableCell('-', {
          'data-title': 'Rozmiar po kompresji',
          'data-compressed-size': ''
        });

        const compressedRatioCell = this.createTableCell('-', {
          'data-title': 'Współczynik kompresji',
          'data-compressed-ratio': ''
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
        row.appendChild(typeCell);
        row.appendChild(sizeCell);
        row.appendChild(compressedSizeCell)
        row.appendChild(compressedRatioCell)
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
    const {fileName, compressedSize, ratio, downloadURL} = data
    const listItem = this.elements.imageTable.querySelector(`[data-file-name="${fileName}"]`);

    if (!listItem) return;

    const actionsCell = listItem.querySelector('[data-actions]');
    const compressedSizeCell = listItem.querySelector('[data-compressed-size]');
    const compressedRatioCell = listItem.querySelector('[data-compressed-ratio]');

    compressedSizeCell.innerHTML = `<span class="image-operation__item-compressed-size">${formatFileSize(parseInt(compressedSize))}</span>`;
    compressedRatioCell.innerHTML = `<span class="mx-auto badge image-operation__compression-ratio">${ratio}%</span>`;
    actionsCell.innerHTML = `
                <a href="${downloadURL}" download class="mx-auto badge image-operation__item-download">
                    <i class="fa-solid fa-circle-down image-operation__item-download-icon"></i>
                    <span>Pobierz</span>
                </a>
            `;

    compressedSizeCell.classList.remove('sr-only');
    compressedRatioCell.classList.remove('sr-only');

    this.setFileProgressSuccess(fileName);
  }
}