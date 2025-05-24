// export default class AdvancedTable {
//   constructor() {

//   }
// }

// Sample data
let currentPage = 1;
const itemsPerPage = 10;
let isLoading = false;
//
// 1. Najpierw wszystkie definicje zmiennych globalnych i danych
let trailsData = [{
  id: 1,
  name: "Kopista",
  distance: 19.13,
  elevation: 337,
  difficulty: 2,
  location: "Góry Sowie",
  element: "earth",
  image: "https://e-szlaki.com/blog/articles/avatar-for-23-612831764307771.png"
}, {
  id: 2,
  name: "Śpiewak",
  distance: 22.77,
  elevation: 767,
  difficulty: 3,
  location: "Góry Sowie",
  element: "fire",
  image: "https://e-szlaki.com/blog/articles/avatar-for-13-583999829139987.png"
}];
let activeSorts = new Map();
// Obiekt przechowujący aktywne filtry
let activeFilters = {
  distance: { min: 0, max: 50 },
  difficulty: { min: 1, max: 15 }
};
const filterPresets = {
  easy: {
    distance: { min: 0, max: 10 },
    difficulty: { min: 1, max: 5 }
  },
  hard: {
    distance: { min: 10, max: 50 },
    difficulty: { min: 10, max: 15 }
  },
  long: {
    distance: { min: 15, max: 50 },
    difficulty: { min: 1, max: 15 }
  },
  short: {
    distance: { min: 0, max: 5 },
    difficulty: { min: 1, max: 15 }
  },
  medium: {
    distance: { min: 5, max: 15 },
    difficulty: { min: 5, max: 10 }
  },
  expert: {
    distance: { min: 0, max: 50 },
    difficulty: { min: 12, max: 15 }
  },
  beginner: {
    distance: { min: 0, max: 8 },
    difficulty: { min: 1, max: 3 }
  }
};
// 2. Funkcje pomocnicze
function getElementIcon(element) {
  const icons = {
    earth: 'ground.png',
    fire: 'fire.png',
    water: 'water.png',
    air: 'air.png',
    life: 'life.png',
    magic: 'magic.png'
  };
  return `https://e-szlaki.com/reward-points/${icons[element]}`;
}

function getDifficultyClass(difficulty) {
  if (difficulty <= 4) return 'difficulty-1';
  if (difficulty <= 8) return 'difficulty-2';
  if (difficulty <= 12) return 'difficulty-3';
  return 'difficulty-4';
}

function renderTrail(trail) {
  const viewMode = $('.table-container').attr('class').includes('view-tiles') ? 'tiles' : 'table';

  if (viewMode === 'tiles') {
    return `
                    <div class="trail-tile" data-id="${trail.id}">
                        <div class="trail-tile-header">
                            <img src="${trail.image || 'https://e-szlaki.com/blog/articles/avatar-for-23-612831764307771.png'}" class="trail-image" alt="${trail.name}">
                            <h3 class="trail-title">${trail.name}</h3>
                        </div>
                        <div class="trail-tile-content">
                            <div class="trail-info">
                                <span class="difficulty-indicator ${getDifficultyClass(trail.difficulty)}">${trail.difficulty}/15</span>
                                <span class="distance"><i class="fas fa-route"></i> ${trail.distance} km</span>
                                <span class="elevation"><i class="fas fa-mountain"></i> ${trail.elevation} m</span>
                            </div>
                            <div class="trail-location">
                                <img src="${getElementIcon(trail.element)}" class="element-icon" alt="${trail.element}">
                                <span>${trail.location}</span>
                            </div>
                            <div class="trail-actions">
                                <button class="btn btn-edit edit-trail" data-id="${trail.id}">Edytuj</button>
                                <button class="btn btn-delete delete-trail" data-id="${trail.id}">Usuń</button>
                            </div>
                        </div>
                    </div>`;
  } else if (viewMode === 'list') {
    return `
                    <tr data-id="${trail.id}">
                        <td>
                            <div class="trail-list-item">
                                <img src="${trail.image || 'https://e-szlaki.com/blog/articles/avatar-for-23-612831764307771.png'}"
                                     class="trail-list-image" alt="${trail.name}">
                                <div class="trail-list-content">
                                    <div class="trail-list-header">
                                        <h3 class="trail-list-title">${trail.name}</h3>
                                        <span class="difficulty-indicator ${getDifficultyClass(trail.difficulty)}">
                                            ${trail.difficulty}/15
                                        </span>
                                    </div>
                                    <div class="trail-list-info">
                                        <span>
                                            <i class="fas fa-route"></i>
                                            ${trail.distance} km
                                        </span>
                                        <span>
                                            <i class="fas fa-mountain"></i>
                                            ${trail.elevation} m
                                        </span>
                                        <span>
                                            <img src="${getElementIcon(trail.element)}" class="element-icon" alt="${trail.element}">
                                            ${trail.element.charAt(0).toUpperCase() + trail.element.slice(1)}
                                        </span>
                                        <span>
                                            <i class="fas fa-map-marker-alt"></i>
                                            ${trail.location}
                                        </span>
                                    </div>
                                    <div class="trail-list-actions">
                                        <button class="btn btn-edit edit-trail" data-id="${trail.id}">Edytuj</button>
                                        <button class="btn btn-delete delete-trail" data-id="${trail.id}">Usuń</button>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>`;
  }

  // Standardowy widok tabeli
  return `
                <tr data-id="${trail.id}">
                    <td class="priority-low"><input type="checkbox" class="row-checkbox"></td>
                    <td class="priority-high">${trail.name}</td>
                    <td class="priority-medium">${trail.distance} km</td>
                    <td class="priority-medium">${trail.elevation} m</td>
                    <td class="priority-high">
                        <span class="difficulty-indicator ${getDifficultyClass(trail.difficulty)}">
                            ${trail.difficulty}/15
                        </span>
                    </td>
                    <td class="priority-medium">${trail.location}</td>
                    <td class="priority-low">
                        <img src="${getElementIcon(trail.element)}" class="element-icon" alt="${trail.element}">
                        ${trail.element.charAt(0).toUpperCase() + trail.element.slice(1)}
                    </td>
                    <td class="priority-high">
                        <div class="actions-column">
                            <button class="btn btn-edit edit-trail" data-id="${trail.id}">Edytuj</button>
                            <button class="btn btn-delete delete-trail" data-id="${trail.id}">Usuń</button>
                        </div>
                    </td>
                </tr>`;
}
//
// Modal masowej edycji
function showBulkEditModal(rows) {
  const $modal = $('#bulkEditModal');
  const $form = $('#bulkEditForm');

  // Wyczyść formularz
  $form[0].reset();

  // Pokaż modal
  $modal.fadeIn(300);

  // Obsługa zamykania
  $modal.find('.modal-close').off('click').on('click', function () {
    $modal.fadeOut(300);
  });

  // Obsługa submitu formularza
  $form.off('submit').on('submit', function (e) {
    e.preventDefault();

    const updates = {
      difficulty: $('#bulkDifficulty').val(),
      location: $('#bulkLocation').val(),
      element: $('#bulkElement').val()
    };

    // Aktualizuj zaznaczone wiersze
    rows.each(function () {
      const $row = $(this);
      const trailId = $row.data('id');

      // Aktualizuj tylko wypełnione pola
      if (updates.difficulty) {
        $row.find('td[data-field="difficulty"]').text(updates.difficulty);
        updateTrailData(trailId, 'difficulty', updates.difficulty);
      }
      if (updates.location) {
        $row.find('td[data-field="location"]').text(updates.location);
        updateTrailData(trailId, 'location', updates.location);
      }
      if (updates.element) {
        const $elementCell = $row.find('td[data-field="element"]');
        $elementCell.find('img').attr('src', getElementIcon(updates.element));
        $elementCell.find('span').text(updates.element);
        updateTrailData(trailId, 'element', updates.element);
      }
    });

    // Zamknij modal
    $modal.fadeOut(300);
  });
}
//
// Funkcja do inteligentnego wyszukiwania
function smartSearch(query, data) {
  if (!query) return data;

  const searchTerms = query.toLowerCase().split(' ');
  return data.filter(trail => {
    const searchableText = `
                    ${trail.name}
                    ${trail.location}
                    ${trail.distance}
                    ${trail.difficulty}
                `.toLowerCase();

    return searchTerms.every(term => {
      // Podstawowa korekcja błędów - akceptuje częściowe dopasowania
      return searchableText.includes(term) ||
        levenshteinDistance(searchableText, term) <= 2;
    });
  });
}
// Funkcja pomocnicza do obliczania odległości Levenshteina (korekcja błędów)
function levenshteinDistance(str1, str2) {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}
//
// Funkcja debounce do optymalizacji wydajności
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
// Walidacja wartości komórki
function validateCellValue(value, type) {
  switch (type) {
    case 'number':
      return !isNaN(value) && value >= 0;
    case 'text':
      return value.length > 0;
    default:
      return true;
  }
}
//
function openModal(trail = null) {
  $('#modalTitle').text(trail ? 'Edytuj szlak' : 'Dodaj nowy szlak');
  if (trail) {
    $('#trailName').val(trail.name);
    $('#trailDistance').val(trail.distance);
    $('#trailElevation').val(trail.elevation);
    $('#trailDifficulty').val(trail.difficulty);
    $('#trailLocation').val(trail.location);
    $('#trailElement').val(trail.element);
    $('#trailImage').val(trail.image);
    $('#trailForm').data('id', trail.id);
  } else {
    $('#trailForm')[0].reset();
    $('#trailForm').removeData('id');
  }
  $('#trailModal').fadeIn(300);
}
// 3. Funkcje inicjalizacyjne
// Inicjalizacja podstawowych funkcjonalności
function wrapTableInContainer() {
  $('.fantasy-table').wrap('<div class="table-container"></div>');
  $('.table-container').append('<div class="table-loading"><div class="loading-spinner"></div></div>');
}
// Dodaj przed funkcją loadTrails()
function initializeResponsiveFeatures() {
  let resizeTimeout;
  const $table = $('.fantasy-table');
  const $container = $('.table-container');

  // Funkcja do inteligentnego scalania kolumn
  function handleColumnMerging() {
    const windowWidth = $(window).width();
    const $rows = $table.find('tbody tr');

    if (windowWidth <= 768) {
      $rows.each(function () {
        const $row = $(this);
        const $cells = $row.find('td');

        // Zbierz dane z ukrytych kolumn
        let hiddenInfo = [];
        $cells.filter(':hidden').each(function () {
          const header = $table.find('th').eq($(this).index()).text();
          const value = $(this).text();
          hiddenInfo.push(`${header}: ${value}`);
        });

        // Dodaj lub zaktualizuj skondensowane informacje
        let $firstCell = $cells.eq(1); // Pierwsza widoczna komórka
        let $collapsedInfo = $firstCell.find('.collapsed-info');

        if (!$collapsedInfo.length) {
          $collapsedInfo = $('<div class="collapsed-info"></div>');
          $firstCell.append($collapsedInfo);
        }

        $collapsedInfo.html(hiddenInfo.join(' • '));
      });
    } else {
      // Usuń skondensowane informacje na większych ekranach
      $('.collapsed-info').remove();
    }
  }

  // Funkcja do adaptacyjnych szerokości kolumn
  function adjustColumnWidths() {
    const $headers = $table.find('th');
    const containerWidth = $container.width();

    $headers.each(function () {
      const $header = $(this);
      const priority = $header.data('priority') || 'medium';
      let width;

      switch (priority) {
        case 'high':
          width = Math.max(150, containerWidth * 0.2);
          break;
        case 'medium':
          width = Math.max(130, containerWidth * 0.15);
          break;
        case 'low':
          width = Math.max(100, containerWidth * 0.1);
          break;
        default:
          width = Math.max(120, containerWidth * 0.15);
      }

      const index = $header.index();
      $header.css('width', width);
      $table.find(`td:nth-child(${index + 1})`).css('width', width);
    });
  }

  // Event listener dla resize
  $(window).on('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      handleColumnMerging();
      adjustColumnWidths();
    }, 250);
  });

  // Inicjalizacja
  handleColumnMerging();
  adjustColumnWidths();

  // Obsługa scrollowania
  let lastScrollTop = 0;
  $container.on('scroll', function () {
    const st = $(this).scrollTop();
    const scrollingDown = st > lastScrollTop;

    // Animuj nagłówki podczas scrollowania
    $table.find('th').css({
      'transform': `translateY(${scrollingDown ? 2 : 0}px)`,
      'transition': 'transform 0.2s ease'
    });

    lastScrollTop = st;
  });
}
// Obsługa edycji inline
function initializeInlineEditing() {
  $(document).on('dblclick', '.editable-cell', function () {
    const $cell = $(this);
    const currentValue = $cell.text();
    const fieldType = $cell.data('type');

    // Tworzenie odpowiedniego inputu
    let $input;
    switch (fieldType) {
      case 'number':
        $input = $('<input>', {
          type: 'number',
          value: currentValue,
          step: $cell.data('step') || 1
        });
        break;
      default:
        $input = $('<input>', {
          type: 'text',
          value: currentValue
        });
    }

    $input.addClass('form-control');

    // Zamiana tekstu na input
    $cell.html($input);
    $cell.addClass('editing');
    $input.focus();

    // Obsługa zatwierdzania zmian
    $input.on('blur keypress', function (e) {
      if (e.type === 'blur' || e.key === 'Enter') {
        const newValue = $(this).val();

        // Walidacja
        if (validateCellValue(newValue, fieldType)) {
          $cell.text(newValue);
          updateTrailData($cell.closest('tr').data('id'), $cell.data('field'), newValue);
        } else {
          alert('Nieprawidłowa wartość!');
          $cell.text(currentValue);
        }

        $cell.removeClass('editing');
      }
    });
  });
}
// Obsługa masowej edycji
function initializeBulkEditing() {
  // Dodaj checkbox do każdego wiersza
  $('.fantasy-table tbody tr').addClass('row-selectable').each(function () {
    const $checkbox = $('<input>', {
      type: 'checkbox',
      class: 'row-checkbox'
    });
    $(this).find('td:first').prepend($checkbox);
  });

  // Zaznaczanie wszystkich
  $('#selectAll').on('change', function () {
    const isChecked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', isChecked);
    $('.fantasy-table tbody tr').toggleClass('row-selected', isChecked);
  });

  // Zaznaczanie pojedynczych wierszy
  $(document).on('change', '.row-checkbox', function () {
    $(this).closest('tr').toggleClass('row-selected', $(this).prop('checked'));
  });

  // Przycisk masowej edycji
  const $bulkEditBtn = $('<button>', {
    class: 'btn btn-edit',
    text: 'Edytuj zaznaczone',
    css: { marginLeft: '10px' }
  }).appendTo('.table-header');

  $bulkEditBtn.click(function () {
    const selectedRows = $('.row-selected');
    if (selectedRows.length === 0) {
      alert('Zaznacz przynajmniej jeden wiersz!');
      return;
    }

    // Tutaj możemy dodać modal do masowej edycji
    showBulkEditModal(selectedRows);
  });
}
// Drag & drop kolumn
function initializeColumnDragDrop() {
  let draggedColumn = null;
  let columns = $('.fantasy-table th.draggable').toArray();

  $('.draggable').on('dragstart', function (e) {
    draggedColumn = this;
    $(this).addClass('dragging');
    e.originalEvent.dataTransfer.setData('text/plain', ''); // Wymagane dla Firefox
  });

  $('.draggable').on('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
  });

  $('.draggable').on('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (draggedColumn !== this) {
      const allColumns = $('.draggable').toArray();
      const draggedIndex = allColumns.indexOf(draggedColumn);
      const dropIndex = allColumns.indexOf(this);

      // Przesuń kolumny w nagłówku
      if (draggedIndex < dropIndex) {
        $(this).after($(draggedColumn));
      } else {
        $(this).before($(draggedColumn));
      }

      // Przesuń odpowiednie kolumny w każdym wierszu
      $('#trailsTable tbody tr').each(function () {
        const cells = $(this).find('td').toArray();
        const draggedCell = cells[draggedIndex + 1]; // +1 because of checkbox column
        const dropCell = cells[dropIndex + 1];

        if (draggedIndex < dropIndex) {
          $(dropCell).after($(draggedCell));
        } else {
          $(dropCell).before($(draggedCell));
        }
      });
    }
    $(draggedColumn).removeClass('dragging');
  });

  $('.draggable').on('dragend', function () {
    $(this).removeClass('dragging');
    draggedColumn = null;
  });
}
// Podświetlanie powiązanych danych
function initializeRelatedHighlight() {
  $(document).on('mouseenter', 'td', function () {
    const value = $(this).text();
    const columnIndex = $(this).index();

    $('td').removeClass('highlight-related');

    $('td').each(function () {
      if ($(this).index() === columnIndex && $(this).text() === value) {
        $(this).addClass('highlight-related');
      }
    });
  });

  $(document).on('mouseleave', 'td', function () {
    $('td').removeClass('highlight-related');
  });
}
//
// Inicjalizacja suwaków i event handlerów
function initializeFilters() {
  // Przycisk pokazywania/ukrywania panelu filtrów
  const $filterButton = $('<button>', {
    class: 'btn btn-edit',
    text: 'Filtry',
    css: { marginLeft: '10px' }
  }).appendTo('.table-header');

  $filterButton.click(() => {
    $('.filter-panel').slideToggle(300);
  });

  // Inicjalizacja suwaków
  $('#distanceRange').on('input', function () {
    const value = $(this).val();
    activeFilters.distance.max = parseFloat(value);
    $(this).closest('.filter-group')
      .find('.range-max')
      .text(value + ' km');
    updateTableWithFilters();
  });

  $('#difficultyRange').on('input', function () {
    const value = $(this).val();
    activeFilters.difficulty.max = parseInt(value);
    $(this).closest('.filter-group')
      .find('.range-max')
      .text(value);
    updateTableWithFilters();
  });

  // Obsługa presetów
  $('.preset-btn').click(function () {
    const presetName = $(this).data('preset');
    const preset = filterPresets[presetName];

    // Aktualizacja suwaków i filtrów
    Object.entries(preset).forEach(([key, value]) => {
      activeFilters[key] = { ...value };
      $(`#${key}Range`).val(value.max);
      $(`#${key}Range`).closest('.filter-group')
        .find('.range-max')
        .text(key === 'distance' ? value.max + ' km' : value.max);
    });

    updateTableWithFilters();

    // Animacja potwierdzenia
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 300);
  });
}
//
function initializeSearch() {
  $('#searchInput').on('input', debounce(function () {
    const searchValue = $(this).val();
    const filteredData = filterData(trailsData);
    const searchedData = smartSearch(searchValue, filteredData);
    const sortedData = multiSort(searchedData);
    refreshTable(sortedData);
    updateResultsCounter(searchedData.length);
  }, 300));
  // Wyszukiwanie
  $('#searchInput').on('input', function () {
    const searchValue = $(this).val().toLowerCase();
    $('#trailsTable tbody tr').each(function () {
      const text = $(this).text().toLowerCase();
      $(this).toggle(text.includes(searchValue));
    });
  });
}
//
// DODAJ initializeInfiniteScroll
function initializeInfiniteScroll() {
  $(window).scroll(function () {
    if ($(window).scrollTop() + $(window).height() >= $(document).height() - 100) {
      currentPage++;
      loadTrails(currentPage);
    }
  });
}

function initializeSorting() {
  $('.fantasy-table th[data-sort]').click(function (e) {
    const sortKey = $(this).data('sort');

    if (e.shiftKey) {
      // Multi-sort z shift
      if (activeSorts.has(sortKey)) {
        if (activeSorts.get(sortKey) === 'asc') {
          activeSorts.set(sortKey, 'desc');
          $(this).removeClass('sort-asc').addClass('sort-desc');
        } else {
          activeSorts.delete(sortKey);
          $(this).removeClass('sort-desc sort-asc');
        }
      } else {
        activeSorts.set(sortKey, 'asc');
        $(this).addClass('sort-asc');
      }
    } else {
      // Single-sort bez shift
      $('.fantasy-table th').removeClass('sort-asc sort-desc');
      activeSorts.clear();
      activeSorts.set(sortKey, 'asc');
      $(this).addClass('sort-asc');
    }

    const sortedData = multiSort(filterData(trailsData));
    refreshTable(sortedData);
  });
}

function initializeModalHandlers() {
  // Obsługa przycisków
  // $('#addNewTrail').click(() => openModal());
  $('.modal-close').click(() => $('#trailModal').fadeOut(300));

  $(window).click(e => {
    if (e.target === $('#trailModal')[0]) {
      $('#trailModal').fadeOut(300);
    }
  });

  // Edycja szlaku
  $(document).on('click', '.edit-trail', function () {
    const trailId = $(this).data('id');
    const trail = trailsData.find(t => t.id === trailId);
    openModal(trail);
  });

  // Usuwanie szlaku
  $(document).on('click', '.delete-trail', function () {
    if (confirm('Czy na pewno chcesz usunąć ten szlak?')) {
      const trailId = $(this).data('id');
      trailsData = trailsData.filter(t => t.id !== trailId);
      $(this).closest('tr').fadeOut(300, function () {
        $(this).remove();
      });
    }
  });
}
// DODAJ initializeFormHandlers
function initializeFormHandlers() {
  // Obsługa formularza
  $('#trailForm').submit(function (e) {
    e.preventDefault();
    const formData = {
      id: $(this).data('id') || trailsData.length + 1,
      name: $('#trailName').val(),
      distance: parseFloat($('#trailDistance').val()),
      elevation: parseInt($('#trailElevation').val()),
      difficulty: parseInt($('#trailDifficulty').val()),
      location: $('#trailLocation').val(),
      element: $('#trailElement').val(),
      image: $('#trailImage').val()
    };

    if ($(this).data('id')) {
      // Edycja istniejącego szlaku
      const index = trailsData.findIndex(t => t.id === formData.id);
      trailsData[index] = formData;
      $(`tr[data-id="${formData.id}"]`).replaceWith(renderTrail(formData));
    } else {
      // Dodawanie nowego szlaku
      trailsData.push(formData);
      $('#trailsTable tbody').append(renderTrail(formData));
    }

    $('#trailModal').fadeOut(300);
  });

  // Obsługa klawisza Escape
  $(document).keyup(function (e) {
    if (e.key === "Escape") {
      $('.filter-panel').slideUp(300);
    }
  });
}
//
function initializeViewSwitcher() {
  // Dodaj przyciski przełączania widoku
  const $viewSwitcher = $('<div class="view-switcher"></div>');
  $viewSwitcher.html(`
                <button class="view-btn active" data-view="table">
                    <i class="fas fa-table"></i> Tabela
                </button>
                <button class="view-btn" data-view="tiles">
                    <i class="fas fa-th"></i> Kafelki
                </button>
                <button class="view-btn" data-view="list">
                    <i class="fas fa-list"></i> Lista
                </button>
            `);

  $('.table-header').prepend($viewSwitcher);

  // Obsługa przełączania widoków
  $('.view-btn').click(function () {
    const view = $(this).data('view');
    $('.view-btn').removeClass('active');
    $(this).addClass('active');

    const $container = $('.table-container');
    $container.removeClass('view-table view-tiles view-list')
      .addClass('view-transition view-' + view);

    // Dodaj małe opóźnienie dla płynniejszej animacji
    setTimeout(() => {
      refreshTable(trailsData);

      // Zachowaj rozwinięte wiersze w widoku listy
      if (view === 'list') {
        $('.trail-details').each(function () {
          if ($(this).is(':visible')) {
            $(this).show();
          }
        });
      }
    }, 50);
  });

  // Rozwijane wiersze
  $(document).on('click', '.fantasy-table tr', function (e) {
    if ($(e.target).is('button, input, select, a')) return;

    const $row = $(this);
    const $details = $row.find('.trail-details');

    if (!$details.length) {
      const trailId = $row.data('id');
      const trail = trailsData.find(t => t.id === trailId);

      if (trail) {
        const $detailsContent = $(`
                            <div class="trail-details">
                                <div class="trail-details-content">
                                    <div class="detail-item">
                                        <span class="detail-label">Szczegółowy opis</span>
                                        <span class="detail-value">${trail.name} - szczegółowy opis trasy</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Ostatnia aktualizacja</span>
                                        <span class="detail-value">2024-02-03</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Dodatkowe informacje</span>
                                        <span class="detail-value">Poziom trudności: ${trail.difficulty}/15</span>
                                    </div>
                                </div>
                                <div class="mini-map" id="map-${trail.id}"></div>
                            </div>
                        `);

        $row.find('td:first').append($detailsContent);
        $detailsContent.slideDown(300);

        // Inicjalizacja mini mapy (przykład z Leaflet)
        if (typeof L !== 'undefined') {
          setTimeout(() => {
            const map = L.map(`map-${trail.id}`).setView([50.0614, 19.9366], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
          }, 100);
        }
      }
    } else {
      $details.slideToggle(300);
    }
  });
}
// DODAJ initializeModals
function initializeModals() {
  // Dodanie HTML modalu do body
  $('body').append(`
                <div class="modal" id="bulkEditModal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Masowa edycja</h2>
                            <button class="modal-close">&times;</button>
                        </div>
                        <form id="bulkEditForm">
                            <div class="form-group">
                                <label>Trudność</label>
                                <input type="number" class="form-control" id="bulkDifficulty" min="1" max="15">
                            </div>
                            <div class="form-group">
                                <label>Lokalizacja</label>
                                <input type="text" class="form-control" id="bulkLocation">
                            </div>
                            <div class="form-group">
                                <label>Żywioł</label>
                                <select class="form-control" id="bulkElement">
                                    <option value="">Wybierz żywioł...</option>
                                    <option value="earth">Ziemia</option>
                                    <option value="fire">Ogień</option>
                                    <option value="water">Woda</option>
                                    <option value="air">Powietrze</option>
                                    <option value="life">Życie</option>
                                    <option value="magic">Magia</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-edit">Zapisz zmiany</button>
                        </form>
                    </div>
                </div>
            `);
}
// 4. Główna funkcja inicjalizacyjna
function initializeTable() {
  initializeModals(); // Dodaj na początku
  // Inicjalizacja podstawowej struktury tabeli
  const $table = $('.fantasy-table');
  wrapTableInContainer();
  initializeResponsiveFeatures();
  initializeFilters(); // DODAJ TĘ LINIĘ
  initializeInlineEditing();
  initializeBulkEditing();
  initializeColumnDragDrop();
  initializeRelatedHighlight();

  // Dodanie klas priorytetów do nagłówków
  $table.find('th').each(function () {
    const $th = $(this);
    const columnType = $th.data('sort');

    // Przypisanie priorytetów kolumnom
    switch (columnType) {
      case 'name':
      case 'difficulty':
        $th.addClass('priority-high');
        break;
      case 'distance':
      case 'elevation':
      case 'location':
        $th.addClass('priority-medium');
        break;
      case 'element':
        $th.addClass('priority-low');
        break;
      default:
        // Kolumny bez sortowania (np. akcje)
        $th.addClass('priority-high');
    }
  });

  // Dodanie obsługi ładowania
  const $loadingIndicator = $('<div class="table-loading"><div class="loading-spinner"></div></div>');
  $table.parent().append($loadingIndicator);
  initializeSearch(); // Dodaj to wywołanie
  initializeInfiniteScroll(); // Dodaj to wywołanie
  initializeSorting(); // Dodaj to wywołanie
  initializeModalHandlers(); // Dodaj to wywołanie
  initializeFormHandlers(); // Dodaj po initializeModalHandlers
  initializeViewSwitcher(); // Dodaj tę linię
  // Inicjalne załadowanie danych
  loadTrails(1);
}

// 5. Funkcje obsługi danych
function loadTrails(page) {
  if (isLoading) return;
  isLoading = true;
  $('.loading').show();

  // Symulacja opóźnienia ładowania danych
  setTimeout(() => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = trailsData.slice(start, end);

    pageData.forEach(trail => {
      $('#trailsTable tbody').append(renderTrail(trail));
    });

    isLoading = false;
    $('.loading').hide();
  }, 800);
}
// Funkcja do filtrowania danych
function filterData(data) {
  return data.filter(trail => {
    return trail.distance >= activeFilters.distance.min &&
      trail.distance <= activeFilters.distance.max &&
      trail.difficulty >= activeFilters.difficulty.min &&
      trail.difficulty <= activeFilters.difficulty.max;
  });
}
// Funkcja do multi-sortowania
function multiSort(data) {
  return data.sort((a, b) => {
    for (let [key, order] of activeSorts) {
      if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

function updateTrailData(id, field, value) {
  const trailIndex = trailsData.findIndex(trail => trail.id === id);
  if (trailIndex !== -1) {
    trailsData[trailIndex][field] = value;
  }
}
//
function refreshTable(data) {
  const $tbody = $('#trailsTable tbody');
  $tbody.empty();

  const viewMode = $('.table-container').attr('class').includes('view-tiles') ? 'tiles' : 'table';

  if (viewMode === 'tiles') {
    data.forEach(trail => {
      $tbody.append($('<tr>').html(`<td>${renderTrail(trail)}</td>`));
    });
  } else {
    data.forEach(trail => {
      $tbody.append(renderTrail(trail));
    });
  }
}
//
// Funkcja aktualizująca tabelę z filtrami
function updateTableWithFilters() {
  const filteredAndSortedData = multiSort(filterData(trailsData));
  refreshTable(filteredAndSortedData);

  // Aktualizacja licznika wyników
  updateResultsCounter(filteredAndSortedData.length);
}
// Funkcja aktualizująca licznik wyników
function updateResultsCounter(count) {
  let $counter = $('.results-counter');
  if (!$counter.length) {
    $counter = $('<div>', {
      class: 'results-counter',
      css: {
        margin: '10px 0',
        color: '#ecf0f1'
      }
    }).insertAfter('.filter-panel');
  }
  $counter.text(`Znalezione szlaki: ${count}`);
}
//
// TUTAJ DODAJ funkcje grupowania
function groupData(data, groupBy) {
  const groups = {};
  data.forEach(item => {
    const groupValue = item[groupBy];
    if (!groups[groupValue]) {
      groups[groupValue] = [];
    }
    groups[groupValue].push(item);
  });
  return groups;
}
//
function renderGroupedData(groups) {
  const $tbody = $('#trailsTable tbody');
  $tbody.empty();

  Object.entries(groups).forEach(([groupName, items]) => {
    const $groupHeader = $('<tr>')
      .addClass('group-header')
      .html(`<td colspan="8">${groupName} (${items.length})</td>`);

    $tbody.append($groupHeader);

    const $groupRows = $('<tr>').addClass('group-rows');
    items.forEach(item => {
      $groupRows.append(renderTrail(item));
    });

    $tbody.append($groupRows);
  });
}
// 6. Na końcu document.ready
$(document).ready(function () {
  initializeTable(); // Zamiast pojedynczych wywołań funkcji
});