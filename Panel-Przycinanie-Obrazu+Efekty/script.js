document.addEventListener('DOMContentLoaded', function () {
  // Elementy DOM
  const imageInput = document.getElementById('image-input');
  const uploadContainer = document.getElementById('upload-container');
  const previewContainer = document.getElementById('preview-container');
  const previewImage = document.getElementById('preview-image');
  const exportButton = document.getElementById('export-button');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Elementy formularza
  const cropWidthInput = document.getElementById('crop-width');
  const cropHeightInput = document.getElementById('crop-height');
  const aspectRatioSelect = document.getElementById('aspect-ratio');
  const rotationAngleInput = document.getElementById('rotation-angle');
  const rotateLeftBtn = document.getElementById('rotate-left');
  const rotateRightBtn = document.getElementById('rotate-right');
  const flipHorizontalBtn = document.getElementById('flip-horizontal');
  const flipVerticalBtn = document.getElementById('flip-vertical');

  // Elementy efektów
  const effectSliders = document.querySelectorAll('.effect-slider');
  const effectResetButtons = document.querySelectorAll('.effect-reset');
  const invertCheckbox = document.getElementById('effect-invert');

  // Zmienne
  let cropper = null;
  let originalImageData = null;
  let currentTab = 'crop';
  let filterLayer = null; // Nowa zmienna dla warstwy filtrów
  let filterLayer2 = null; // Nowa zmienna dla warstwy filtrów

  // Obiekt przechowujący wartości efektów
  let effectsValues = {
    blur: 0,
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    saturation: 100,
    sepia: 0,
    hueRotate: 0,
    invert: false
  }; 


  // Element checkbox do włączania/wyłączania przycinania
  const cropToggleCheckbox = document.getElementById('crop-toggle-checkbox');

  // Flaga do śledzenia stanu croppera
  let isCropperActive = true;



  // Obsługa zmiany stanu checkboxa
  cropToggleCheckbox.addEventListener('change', function () {
    if (this.checked) {
      enableCropper();
    } else {
      disableCropper();
    }
  });
 
  function enableCropper() {
    document.querySelectorAll('[data-cropper-action]').forEach(cropperAction => cropperAction.removeAttribute('hidden'))

    document.querySelectorAll('.cropper-dashed').forEach(cropperAction => cropperAction.removeAttribute('hidden'))
    document.querySelector('.cropper-center')?.removeAttribute('hidden')


    if (document.querySelector('.cropper-view-box')) {
      document.querySelector('.cropper-view-box').style.overflow = 'hidden'
    }
  }
 
  function disableCropper() {
    document.querySelectorAll('[data-cropper-action]').forEach(cropperAction => cropperAction.setAttribute('hidden', ''))

    document.querySelectorAll('.cropper-dashed').forEach(cropperAction => cropperAction.setAttribute('hidden', ''))
    document.querySelector('.cropper-center')?.setAttribute('hidden', '')

    if (document.querySelector('.cropper-view-box')) {
      document.querySelector('.cropper-view-box').style.overflow = 'initial'
    }
  }   

  // Obsługa przełączania zakładek
  tabButtons.forEach(button => {
    button.addEventListener('click', function () {
      const tab = this.dataset.tab;

      // Aktywacja przycisku zakładki
      tabButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');

      // Aktywacja zawartości zakładki
      tabPanes.forEach(pane => pane.classList.remove('active'));
      document.getElementById(`${tab}-tab`).classList.add('active');

      currentTab = tab;

      // Aktualizacja ustawień croppera w zależności od zakładki
      if (cropper) {
        if (tab === 'crop') {
          cropper.setDragMode('crop');
        } else if (tab === 'rotate') {
          cropper.setDragMode('move');
        } else if (tab === 'effects') {
          cropper.setDragMode('none');
        }
      }
    });
  });  

  // Przycisk resetowania wszystkich ustawień
  const resetAllButton = document.getElementById('reset-all-button');

  // Obsługa kliknięcia przycisku resetowania
  resetAllButton.addEventListener('click', function () {
    // Pokaż okno potwierdzenia
    if (confirm('Czy na pewno chcesz zresetować wszystkie ustawienia? Ta operacja nie może być cofnięta.')) {
      resetAllSettings();
    }
  });

  // Funkcja resetująca wszystkie ustawienia
  function resetAllSettings() {
    // 1. Resetuj filtry (jeśli istnieją)
    resetAllFilters();

    // 2. Resetuj przycinanie (jeśli Cropper jest aktywny)
    resetCropping();

    // 3. Resetuj obrót
    resetRotation();

    // 4. Aktualizuj interfejs
    updateUIAfterReset();
  }

  // Funkcja resetująca wszystkie filtry
  function resetAllFilters() {
    // Resetuj wartości efektów do domyślnych
    effectsValues = {
      blur: 0,
      brightness: 100,
      contrast: 100,
      grayscale: 0,
      saturation: 100,
      sepia: 0,
      hueRotate: 0,
      invert: false
    };

    // Resetuj wartości wszystkich suwaków
    const effectSliders = document.querySelectorAll('.effect-slider');
    effectSliders.forEach(slider => {
      const effectId = slider.id;

      // Ustaw domyślne wartości w zależności od typu efektu
      if (effectId.includes('brightness') || effectId.includes('contrast') || effectId.includes('saturation')) {
        slider.value = 100;
      } else if (effectId.includes('hue-rotate')) {
        slider.value = 0;
      } else if (effectId.includes('blur') || effectId.includes('grayscale') || effectId.includes('sepia')) {
        slider.value = 0;
      }

      // Aktualizuj wyświetlanie wartości
      const valueDisplay = slider.parentElement.querySelector('.effect-value');
      if (valueDisplay) {
        updateEffectValueDisplay(slider, valueDisplay);
      }
    });

    // Resetuj checkbox invert
    const invertCheckbox = document.getElementById('effect-invert');
    if (invertCheckbox) {
      invertCheckbox.checked = false;
    }

    // Zastosuj zresetowane filtry
    if (typeof applyEffects === 'function') {
      applyEffects();
    } else {
      // Alternatywne podejście, jeśli funkcja applyEffects nie istnieje
      const imgElement = document.querySelector('.cropper-container img');
      if (imgElement) {
        imgElement.style.filter = '';
      }
    }
  }

  // Funkcja resetująca przycinanie
  function resetCropping() {
    if (cropper && isCropperActive) {
      // Resetuj obszar przycinania do domyślnego
      cropper.reset();
      cropper.setAspectRatio(NaN); // Resetuj proporcje

      // Aktualizuj inputy
      updateCropBoxInputs();

      // Resetuj select z proporcjami
      const aspectRatioSelect = document.getElementById('aspect-ratio');
      if (aspectRatioSelect) {
        aspectRatioSelect.value = 'free';
      }
    }
  }

  // Funkcja resetująca obrót
  function resetRotation() {
    if (cropper) {
      // Resetuj obrót
      cropper.rotateTo(0);

      // Resetuj skalowanie (odbicie)
      const data = cropper.getData();
      if (data.scaleX < 0) {
        cropper.scaleX(1);
      }
      if (data.scaleY < 0) {
        cropper.scaleY(1);
      }

      // Aktualizuj input z kątem obrotu
      const rotationAngleInput = document.getElementById('rotation-angle');
      if (rotationAngleInput) {
        rotationAngleInput.value = 0;
      }
    }
  }

  // Funkcja aktualizująca interfejs po resecie
  function updateUIAfterReset() {
    // Pokaż komunikat o zresetowaniu ustawień
    const resetMessage = document.createElement('div');
    resetMessage.className = 'reset-message';
    resetMessage.textContent = 'Wszystkie ustawienia zostały zresetowane';
    resetMessage.style.position = 'fixed';
    resetMessage.style.top = '20px';
    resetMessage.style.left = '50%';
    resetMessage.style.transform = 'translateX(-50%)';
    resetMessage.style.padding = '10px 20px';
    resetMessage.style.backgroundColor = 'var(--blue)';
    resetMessage.style.color = 'white';
    resetMessage.style.borderRadius = '4px';
    resetMessage.style.zIndex = '9999';
    resetMessage.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

    document.body.appendChild(resetMessage);

    // Usuń komunikat po 3 sekundach
    setTimeout(function () {
      resetMessage.style.opacity = '0';
      resetMessage.style.transition = 'opacity 0.5s ease';

      setTimeout(function () {
        document.body.removeChild(resetMessage);
      }, 500);
    }, 3000);
  }  

  // Obsługa wyboru/upuszczenia pliku
  function setupImageUpload() {
    // Obsługa wyboru pliku przez input
    imageInput.addEventListener('change', handleFileSelect);

    // Obsługa przeciągnięcia i upuszczenia
    uploadContainer.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.borderColor = 'var(--light-blue)';
      this.style.backgroundColor = 'var(--background-25)';
    });

    uploadContainer.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.borderColor = 'var(--light-gray)';
      this.style.backgroundColor = '';
    });

    uploadContainer.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      this.style.borderColor = 'var(--light-gray)';
      this.style.backgroundColor = '';

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  // Obsługa wyboru pliku
  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }

  // Przetwarzanie wybranego pliku
  function handleFile(file) {
    if (!file.type.match('image.*')) {
      alert('Proszę wybrać plik obrazu.');
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      originalImageData = e.target.result;

      // Wyświetlenie obrazu
      previewImage.src = originalImageData;
      uploadContainer.classList.add('hide');
      previewContainer.classList.remove('hide');

      // Inicjalizacja Cropper.js po załadowaniu obrazu
      previewImage.onload = function () {
        initCropper();
        exportButton.disabled = false;

        disableCropper(); // TODO: Tutej
      };
    };

    reader.readAsDataURL(file);
  }

  // Inicjalizacja Cropper.js
  function initCropper() {
    if (cropper) {
      cropper.destroy();
    }

    cropper = new Cropper(previewImage, {
      viewMode: 1,
      dragMode: 'crop',
      autoCropArea: 0.8,
      restore: false,
      modal: true,
      guides: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      ready: function () {
        updateCropBoxInputs();

        // Ustaw odpowiedni tryb w zależności od aktywnej zakładki
        if (currentTab === 'rotate') {
          cropper.setDragMode('move');
        } else if (currentTab === 'effects') {
          cropper.setDragMode('none');
        }

        // Dodaj warstwę filtrów
        createFilterLayer();

        // Inicjalizacja obsługi efektów
        setupEffectsHandlers();
      },
      crop: function (event) {
        const data = event.detail;

        // Aktualizacja inputów tylko gdy użytkownik zmienia rozmiar ręcznie
        if (!cropWidthInput.matches(':focus') && !cropHeightInput.matches(':focus')) {
          cropWidthInput.value = Math.round(data.width);
          cropHeightInput.value = Math.round(data.height);
        }

        // Aktualizacja pozycji warstwy filtrów
        updateFilterLayerPosition();
      }
    });
  }

  // NOWA FUNKCJA: Tworzenie warstwy filtrów
  function createFilterLayer() {
    // Usuń istniejącą warstwę filtrów, jeśli istnieje
    // if (filterLayer) {
    //   filterLayer.remove();
    // }

    // Znajdź kontener Cropper.js
    const cropperContainer = document.querySelector('.cropper-container');

    //console.log('.cropper-container: ', cropperContainer)

    //if (!cropperContainer) return;

    // złap warstwę filtrów 
    filterLayer = cropperContainer.querySelector('.cropper-view-box > img')
    filterLayer2 = cropperContainer.querySelector('.cropper-canvas > img')
    // filterLayer.classList.add('filter-layer');

    // Zastosuj style do warstwy filtrów
    // filterLayer.style.position = 'absolute';
    // filterLayer.style.top = '0';
    // filterLayer.style.left = '0';
    // filterLayer.style.width = '100%';
    // filterLayer.style.height = '100%';
    // filterLayer.style.pointerEvents = 'none';
    //filterLayer.style.zIndex = '5'; // Upewnij się, że jest nad obrazem, ale pod kontrolkami croppera

    // Dodaj warstwę filtrów do kontenera Cropper.js
    //cropperContainer.appendChild(filterLayer);

    // Aktualizuj pozycję warstwy filtrów
    updateFilterLayerPosition();
  }

  // NOWA FUNKCJA: Aktualizacja pozycji warstwy filtrów
  function updateFilterLayerPosition() {
    if (!filterLayer || !cropper) return;

    // Pobierz dane o obszarze przycinania
    const canvasData = cropper.getCanvasData();
    const cropBoxData = cropper.getCropBoxData();

    // Ustaw pozycję i rozmiar warstwy filtrów, aby pokrywała się z obszarem obrazu
    // filterLayer.style.top = canvasData.top + 'px';
    // filterLayer.style.left = canvasData.left + 'px';
    // filterLayer.style.width = canvasData.width + 'px';
    // filterLayer.style.height = canvasData.height + 'px';
  }

  // Aktualizacja inputów na podstawie aktualnego crop box
  function updateCropBoxInputs() {
    if (cropper) {
      const data = cropper.getData();
      cropWidthInput.value = Math.round(data.width);
      cropHeightInput.value = Math.round(data.height);
    }
  }

  // Obsługa zmiany szerokości przycięcia
  cropWidthInput.addEventListener('change', function () {
    if (cropper) {
      const width = parseInt(this.value);
      if (width > 0) {
        const data = cropper.getData();
        data.width = width;
        cropper.setData(data);
      }
    }
  });

  // Obsługa zmiany wysokości przycięcia
  cropHeightInput.addEventListener('change', function () {
    if (cropper) {
      const height = parseInt(this.value);
      if (height > 0) {
        const data = cropper.getData();
        data.height = height;
        cropper.setData(data);
      }
    }
  });

  // Obsługa zmiany proporcji
  aspectRatioSelect.addEventListener('change', function () {
    if (cropper) {
      const value = this.value;
      let aspectRatio;

      switch (value) {
        case '1:1':
          aspectRatio = 1;
          break;
        case '4:3':
          aspectRatio = 4 / 3;
          break;
        case '16:9':
          aspectRatio = 16 / 9;
          break;
        default:
          aspectRatio = NaN; // Dowolne proporcje
      }

      cropper.setAspectRatio(aspectRatio);
      updateCropBoxInputs();
    }
  });

  // Obsługa zmiany kąta obrotu
  rotationAngleInput.addEventListener('change', function () {
    if (cropper) {
      const angle = parseInt(this.value) || 0;
      cropper.rotateTo(angle);
    }
  });

  // Obsługa przycisku obrotu w lewo
  rotateLeftBtn.addEventListener('click', function () {
    if (cropper) {
      cropper.rotate(-90);
      updateRotationAngle();
    }
  });

  // Obsługa przycisku obrotu w prawo
  rotateRightBtn.addEventListener('click', function () {
    if (cropper) {
      cropper.rotate(90);
      updateRotationAngle();
    }
  });

  // Obsługa przycisku odbicia poziomego
  flipHorizontalBtn.addEventListener('click', function () {
    if (cropper) {
      cropper.scaleX(-cropper.getData().scaleX || -1);
    }
  });

  // Obsługa przycisku odbicia pionowego
  flipVerticalBtn.addEventListener('click', function () {
    if (cropper) {
      cropper.scaleY(-cropper.getData().scaleY || -1);
    }
  });

  // Aktualizacja pola input z kątem obrotu
  function updateRotationAngle() {
    if (cropper) {
      const data = cropper.getData();
      rotationAngleInput.value = Math.round(data.rotate);
    }
  }

  // ZMODYFIKOWANA FUNKCJA: Konfiguracja obsługi efektów
  function setupEffectsHandlers() {
    // Obsługa suwaków efektów
    effectSliders.forEach(slider => {
      const effectId = slider.id;
      const effectName = effectId.replace('effect-', '').replace('-', '');
      const valueDisplay = slider.parentElement.querySelector('.effect-value');

      // Ustaw początkowe wartości
      updateEffectValueDisplay(slider, valueDisplay);

      // Obsługa zmiany wartości
      slider.addEventListener('input', function () {
        // Aktualizuj wartość w obiekcie efektów
        if (effectName === 'hue-rotate' || effectName === 'hueRotate') {
          effectsValues.hueRotate = parseInt(this.value);
        } else {
          effectsValues[effectName] = parseInt(this.value);
        }

        // Aktualizuj wyświetlanie wartości
        updateEffectValueDisplay(this, valueDisplay);

        // Zastosuj efekty
        applyEffects();
      });
    });

    // Obsługa przycisku resetowania dla każdego efektu
    effectResetButtons.forEach(button => {
      button.addEventListener('click', function () {
        const effectName = this.dataset.effect;
        const slider = document.getElementById(`effect-${effectName.replace(/([A-Z])/g, '-$1').toLowerCase()}`);

        // Resetuj wartość efektu
        switch (effectName) {
          case 'blur':
            effectsValues.blur = 0;
            slider.value = 0;
            break;
          case 'brightness':
          case 'contrast':
          case 'saturation':
            effectsValues[effectName] = 100;
            slider.value = 100;
            break;
          case 'grayscale':
          case 'sepia':
            effectsValues[effectName] = 0;
            slider.value = 0;
            break;
          case 'hueRotate':
            effectsValues.hueRotate = 0;
            slider.value = 0;
            break;
          case 'invert':
            effectsValues.invert = false;
            invertCheckbox.checked = false;
            break;
        }

        // Aktualizuj wyświetlanie wartości
        const valueDisplay = slider ? slider.parentElement.querySelector('.effect-value') : null;
        if (valueDisplay) {
          updateEffectValueDisplay(slider, valueDisplay);
        }

        // Zastosuj efekty
        applyEffects();
      });
    });

    // Obsługa checkbox dla efektu invert
    invertCheckbox.addEventListener('change', function () {
      effectsValues.invert = this.checked;
      applyEffects();
    });
  }

  // NOWA FUNKCJA: Aktualizacja wyświetlania wartości efektu
  function updateEffectValueDisplay(slider, valueDisplay) {
    if (!slider || !valueDisplay) return;

    const effectId = slider.id;
    let unit = '';

    if (effectId.includes('blur')) {
      unit = 'px';
    } else if (effectId.includes('hue-rotate')) {
      unit = 'deg';
    } else {
      unit = '%';
    }

    valueDisplay.textContent = `${slider.value}${unit}`;
  }

  // ZMODYFIKOWANA FUNKCJA: Zastosowanie wszystkich efektów do obrazu
  function applyEffects() {
    if (!cropper || !filterLayer) return;

    // Budowanie stringa CSS filter
    let filterString = '';

    // Dodawanie poszczególnych filtrów
    if (effectsValues.blur > 0) {
      filterString += `blur(${effectsValues.blur}px) `;
    }

    if (effectsValues.brightness !== 100) {
      filterString += `brightness(${effectsValues.brightness}%) `;
    }

    if (effectsValues.contrast !== 100) {
      filterString += `contrast(${effectsValues.contrast}%) `;
    }

    if (effectsValues.grayscale > 0) {
      filterString += `grayscale(${effectsValues.grayscale}%) `;
    }

    if (effectsValues.saturation !== 100) {
      filterString += `saturate(${effectsValues.saturation}%) `;
    }

    if (effectsValues.sepia > 0) {
      filterString += `sepia(${effectsValues.sepia}%) `;
    }

    if (effectsValues.hueRotate > 0) {
      filterString += `hue-rotate(${effectsValues.hueRotate}deg) `;
    }

    if (effectsValues.invert) {
      filterString += `invert(100%) `;
    }

    // Zastosowanie filtrów do warstwy filtrów
    filterLayer.style.filter = filterString;
    filterLayer2.style.filter = filterString;

    // cropper-canvas

    // Dodaj tło z mixBlendMode, aby efekty działały poprawnie
    filterLayer.style.background = 'transparent';
    filterLayer.style.mixBlendMode = 'normal';

    filterLayer2.style.background = 'transparent';
    filterLayer2.style.mixBlendMode = 'normal';
  }

  // ZMODYFIKOWANA FUNKCJA: Obsługa eksportu obrazu
  exportButton.addEventListener('click', function () {
    if (!cropper) return;

    // Pobierz przycięty obraz jako canvas
    const canvas = cropper.getCroppedCanvas({
      minWidth: 256,
      minHeight: 256,
      maxWidth: 4096,
      maxHeight: 4096,
      fillColor: '#fff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });

    if (canvas) {
      // Tworzenie nowego canvas do zastosowania efektów
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      const ctx = finalCanvas.getContext('2d');

      // Narysuj oryginalny obraz na nowym canvas
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

      // Zastosuj efekty przy użyciu filtrów CSS
      ctx.filter = filterLayer.style.filter;

      // Narysuj obraz ponownie z zastosowanymi filtrami
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(canvas, 0, 0);

      ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
      ctx.drawImage(tempCanvas, 0, 0);

      // Konwersja canvas do bloba
      finalCanvas.toBlob(function (blob) {
        // Utworzenie URL dla bloba
        const url = URL.createObjectURL(blob);

        // Utworzenie elementu <a> do pobrania
        const link = document.createElement('a');
        link.download = 'edytowane-zdjecie.png';
        link.href = url;

        // Dodanie do DOM i kliknięcie
        document.body.appendChild(link);
        link.click();

        // Usunięcie elementu i zwolnienie URL
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    }
  });

  // Inicjalizacja
  setupImageUpload();
})