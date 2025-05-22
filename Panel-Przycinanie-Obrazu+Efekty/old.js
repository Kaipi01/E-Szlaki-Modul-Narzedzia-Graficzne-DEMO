// document.addEventListener('DOMContentLoaded', function() {
//   // Elementy DOM
//   const imageInput = document.getElementById('image-input');
//   const uploadContainer = document.getElementById('upload-container');
//   const previewContainer = document.getElementById('preview-container');
//   const previewImage = document.getElementById('preview-image');
//   const exportButton = document.getElementById('export-button');
//   const tabButtons = document.querySelectorAll('.tab-button');
//   const tabPanes = document.querySelectorAll('.tab-pane');

//   // Elementy formularza
//   const cropWidthInput = document.getElementById('crop-width');
//   const cropHeightInput = document.getElementById('crop-height');
//   const aspectRatioSelect = document.getElementById('aspect-ratio');
//   const rotationAngleInput = document.getElementById('rotation-angle');
//   const rotateLeftBtn = document.getElementById('rotate-left');
//   const rotateRightBtn = document.getElementById('rotate-right');
//   const flipHorizontalBtn = document.getElementById('flip-horizontal');
//   const flipVerticalBtn = document.getElementById('flip-vertical');

//   // Zmienne
//   let cropper = null;
//   let originalImageData = null;
//   let currentTab = 'crop';

//   // Obsługa przełączania zakładek
//   tabButtons.forEach(button => {
//     button.addEventListener('click', function() {
//       const tab = this.dataset.tab;

//       // Aktywacja przycisku zakładki
//       tabButtons.forEach(btn => btn.classList.remove('active'));
//       this.classList.add('active');

//       // Aktywacja zawartości zakładki
//       tabPanes.forEach(pane => pane.classList.remove('active'));
//       document.getElementById(`${tab}-tab`).classList.add('active');

//       currentTab = tab;

//       // Aktualizacja ustawień croppera w zależności od zakładki
//       if (cropper) {
//         if (tab === 'crop') {
//           cropper.setDragMode('crop');
//           cropper.crop();
//           updateCropBoxInputs();
//         } else if (tab === 'rotate') {
//           cropper.setDragMode('move');
//         }
//       }
//     });
//   });

//   // Obsługa wyboru/upuszczenia pliku
//   function setupImageUpload() {
//     // Obsługa wyboru pliku przez input
//     imageInput.addEventListener('change', handleFileSelect);

//     // Obsługa przeciągnięcia i upuszczenia
//     uploadContainer.addEventListener('dragover', function(e) {
//       e.preventDefault();
//       e.stopPropagation();
//       this.style.borderColor = 'var(--light-blue)';
//       this.style.backgroundColor = 'var(--background-25)';
//     });

//     uploadContainer.addEventListener('dragleave', function(e) {
//       e.preventDefault();
//       e.stopPropagation();
//       this.style.borderColor = 'var(--light-gray)';
//       this.style.backgroundColor = '';
//     });

//     uploadContainer.addEventListener('drop', function(e) {
//       e.preventDefault();
//       e.stopPropagation();
//       this.style.borderColor = 'var(--light-gray)';
//       this.style.backgroundColor = '';

//       if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//         handleFile(e.dataTransfer.files[0]);
//       }
//     });
//   }

//   // Obsługa wyboru pliku
//   function handleFileSelect(e) {
//     if (e.target.files && e.target.files[0]) {
//       handleFile(e.target.files[0]);
//     }
//   }

//   // Przetwarzanie wybranego pliku
//   function handleFile(file) {
//     if (!file.type.match('image.*')) {
//       alert('Proszę wybrać plik obrazu.');
//       return;
//     }

//     const reader = new FileReader();

//     reader.onload = function(e) {
//       originalImageData = e.target.result;

//       // Wyświetlenie obrazu
//       previewImage.src = originalImageData;
//       uploadContainer.classList.add('hide');
//       previewContainer.classList.remove('hide');

//       // Inicjalizacja Cropper.js po załadowaniu obrazu
//       previewImage.onload = function() {
//         initCropper();
//         exportButton.disabled = false;
//       };
//     };

//     reader.readAsDataURL(file);
//   }

//   // Inicjalizacja Cropper.js
//   function initCropper() {
//     if (cropper) {
//       cropper.destroy();
//     }

//     cropper = new Cropper(previewImage, {
//       viewMode: 1,
//       dragMode: 'crop',
//       autoCropArea: 0.8,
//       restore: false,
//       modal: true,
//       guides: true,
//       highlight: true,
//       cropBoxMovable: true,
//       cropBoxResizable: true,
//       toggleDragModeOnDblclick: false,
//       ready: function() {
//         updateCropBoxInputs();

//         // Ustaw odpowiedni tryb w zależności od aktywnej zakładki
//         if (currentTab === 'rotate') {
//           cropper.setDragMode('move');
//         }
//       },
//       crop: function(event) {
//         const data = event.detail;

//         // Aktualizacja inputów tylko gdy użytkownik zmienia rozmiar ręcznie
//         if (!cropWidthInput.matches(':focus') && !cropHeightInput.matches(':focus')) {
//           cropWidthInput.value = Math.round(data.width);
//           cropHeightInput.value = Math.round(data.height);
//         }
//       }
//     });
//   }

//   // Aktualizacja inputów na podstawie aktualnego crop box
//   function updateCropBoxInputs() {
//     if (cropper) {
//       const data = cropper.getData();
//       cropWidthInput.value = Math.round(data.width);
//       cropHeightInput.value = Math.round(data.height);
//     }
//   }

//   // Obsługa zmiany szerokości przycięcia
//   cropWidthInput.addEventListener('change', function() {
//     if (cropper) {
//       const width = parseInt(this.value);
//       if (width > 0) {
//         const data = cropper.getData();
//         data.width = width;
//         cropper.setData(data);
//       }
//     }
//   });

//   // Obsługa zmiany wysokości przycięcia
//   cropHeightInput.addEventListener('change', function() {
//     if (cropper) {
//       const height = parseInt(this.value);
//       if (height > 0) {
//         const data = cropper.getData();
//         data.height = height;
//         cropper.setData(data);
//       }
//     }
//   });

//   // Obsługa zmiany proporcji
//   aspectRatioSelect.addEventListener('change', function() {
//     if (cropper) {
//       const value = this.value;
//       let aspectRatio;

//       switch (value) {
//         case '1:1':
//           aspectRatio = 1;
//           break;
//         case '4:3':
//           aspectRatio = 4/3;
//           break;
//         case '16:9':
//           aspectRatio = 16/9;
//           break;
//         default:
//           aspectRatio = NaN; // Dowolne proporcje
//       }

//       cropper.setAspectRatio(aspectRatio);
//       updateCropBoxInputs();
//     }
//   });

//   // Obsługa zmiany kąta obrotu
//   rotationAngleInput.addEventListener('change', function() {
//     if (cropper) {
//       const angle = parseInt(this.value) || 0;
//       cropper.rotateTo(angle);
//     }
//   });

//   // Obsługa przycisku obrotu w lewo
//   rotateLeftBtn.addEventListener('click', function() {
//     if (cropper) {
//       cropper.rotate(-90);
//       updateRotationAngle();
//     }
//   });

//   // Obsługa przycisku obrotu w prawo
//   rotateRightBtn.addEventListener('click', function() {
//     if (cropper) {
//       cropper.rotate(90);
//       updateRotationAngle();
//     }
//   });

//   // Obsługa przycisku odbicia poziomego
//   flipHorizontalBtn.addEventListener('click', function() {
//     if (cropper) {
//       cropper.scaleX(-cropper.getData().scaleX || -1);
//     }
//   });

//   // Obsługa przycisku odbicia pionowego
//   flipVerticalBtn.addEventListener('click', function() {
//     if (cropper) {
//       cropper.scaleY(-cropper.getData().scaleY || -1);
//     }
//   });

//   // Aktualizacja pola input z kątem obrotu
//   function updateRotationAngle() {
//     if (cropper) {
//       const data = cropper.getData();
//       rotationAngleInput.value = Math.round(data.rotate);
//     }
//   }

//   // Obsługa eksportu obrazu
//   exportButton.addEventListener('click', function() {
//     if (!cropper) return;

//     const canvas = cropper.getCroppedCanvas({
//       minWidth: 256,
//       minHeight: 256,
//       maxWidth: 4096,
//       maxHeight: 4096,
//       fillColor: '#fff',
//       imageSmoothingEnabled: true,
//       imageSmoothingQuality: 'high',
//     });

//     if (canvas) {
//       // Konwersja canvas do bloba
//       canvas.toBlob(function(blob) {
//         // Utworzenie URL dla bloba
//         const url = URL.createObjectURL(blob);

//         // Utworzenie elementu <a> do pobrania
//         const link = document.createElement('a');
//         link.download = 'edytowane-zdjecie.png';
//         link.href = url;

//         // Dodanie do DOM i kliknięcie
//         document.body.appendChild(link);
//         link.click();

//         // Usunięcie elementu i zwolnienie URL
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);
//       }, 'image/png');
//     }
//   });

//   // Inicjalizacja
//   setupImageUpload();
// });





// /**
//  * Funkcja tworząca element canvas na podstawie obrazu w formacie base64
//  * @param {string} base64Image - Obraz w formacie base64 (np. "data:image/jpeg;base64,/9j/4AAQSkZ...")
//  * @param {function} callback - Funkcja wywołana po utworzeniu canvas (otrzymuje canvas jako parametr)
//  */
// function createCanvasFromBase64(base64Image, callback) {
//   // Utwórz nowy element obrazu
//   const img = new Image();

//   // Ustaw funkcję wywoływaną po załadowaniu obrazu
//   img.onload = function () {
//     // Utwórz element canvas
//     const canvas = document.createElement('canvas');

//     // Ustaw wymiary canvas na wymiary obrazu
//     canvas.width = img.width;
//     canvas.height = img.height;

//     // Pobierz kontekst 2D canvas
//     const ctx = canvas.getContext('2d');

//     // Narysuj obraz na canvas
//     ctx.drawImage(img, 0, 0, img.width, img.height);

//     // Wywołaj funkcję zwrotną z utworzonym canvas
//     if (typeof callback === 'function') {
//       callback(canvas);
//     }
//   };

//   // Obsługa błędów ładowania obrazu
//   img.onerror = function () {
//     console.error('Nie udało się załadować obrazu z base64');
//     if (typeof callback === 'function') {
//       callback(null);
//     }
//   };

//   // Ustaw źródło obrazu na string base64
//   img.src = base64Image;
// }



// document.addEventListener('DOMContentLoaded', function () {
//   // Elementy DOM
//   const imageInput = document.getElementById('image-input');
//   const uploadContainer = document.getElementById('upload-container');
//   const previewContainer = document.getElementById('preview-container');
//   const previewImage = document.getElementById('preview-image');
//   const exportButton = document.getElementById('export-button');
//   const tabButtons = document.querySelectorAll('.tab-button');
//   const tabPanes = document.querySelectorAll('.tab-pane');

//   // Elementy formularza
//   const cropWidthInput = document.getElementById('crop-width');
//   const cropHeightInput = document.getElementById('crop-height');
//   const aspectRatioSelect = document.getElementById('aspect-ratio');
//   const rotationAngleInput = document.getElementById('rotation-angle');
//   const rotateLeftBtn = document.getElementById('rotate-left');
//   const rotateRightBtn = document.getElementById('rotate-right');
//   const flipHorizontalBtn = document.getElementById('flip-horizontal');
//   const flipVerticalBtn = document.getElementById('flip-vertical');

//   // Elementy efektów
//   const effectSliders = document.querySelectorAll('.effect-slider');
//   const effectResetButtons = document.querySelectorAll('.effect-reset');
//   const invertCheckbox = document.getElementById('effect-invert');

//   // Zmienne
//   let cropper = null;
//   let originalImageData = null;
//   let currentTab = 'crop';

//   // Obiekt przechowujący wartości efektów
//   let effectsValues = {
//     blur: 0,
//     brightness: 100,
//     contrast: 100,
//     grayscale: 0,
//     saturation: 100,
//     sepia: 0,
//     hueRotate: 0,
//     invert: false
//   };

//   // Obsługa przełączania zakładek
//   tabButtons.forEach(button => {
//     button.addEventListener('click', function () {
//       const tab = this.dataset.tab;

//       // Aktywacja przycisku zakładki
//       tabButtons.forEach(btn => btn.classList.remove('active'));
//       this.classList.add('active');

//       // Aktywacja zawartości zakładki
//       tabPanes.forEach(pane => pane.classList.remove('active'));
//       document.getElementById(`${tab}-tab`).classList.add('active');

//       currentTab = tab;

//       // Aktualizacja ustawień croppera w zależności od zakładki
//       if (cropper) {
//         if (tab === 'crop') {
//           cropper.setDragMode('crop');
//           cropper.crop();
//           updateCropBoxInputs();
//         } else if (tab === 'rotate') {
//           cropper.setDragMode('move');
//         } else if (tab === 'effects') {
//           cropper.setDragMode('none');
//         }
//       }
//     });
//   });

//   // Obsługa wyboru/upuszczenia pliku
//   function setupImageUpload() {
//     // Obsługa wyboru pliku przez input
//     imageInput.addEventListener('change', handleFileSelect);

//     // Obsługa przeciągnięcia i upuszczenia
//     uploadContainer.addEventListener('dragover', function (e) {
//       e.preventDefault();
//       e.stopPropagation();
//       this.style.borderColor = 'var(--light-blue)';
//       this.style.backgroundColor = 'var(--background-25)';
//     });

//     uploadContainer.addEventListener('dragleave', function (e) {
//       e.preventDefault();
//       e.stopPropagation();
//       this.style.borderColor = 'var(--light-gray)';
//       this.style.backgroundColor = '';
//     });

//     uploadContainer.addEventListener('drop', function (e) {
//       e.preventDefault();
//       e.stopPropagation();
//       this.style.borderColor = 'var(--light-gray)';
//       this.style.backgroundColor = '';

//       if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//         handleFile(e.dataTransfer.files[0]);
//       }
//     });
//   }

//   // Obsługa wyboru pliku
//   function handleFileSelect(e) {
//     if (e.target.files && e.target.files[0]) {
//       handleFile(e.target.files[0]);
//     }
//   }

//   // Przetwarzanie wybranego pliku
//   function handleFile(file) {
//     if (!file.type.match('image.*')) {
//       alert('Proszę wybrać plik obrazu.');
//       return;
//     }

//     const reader = new FileReader();

//     reader.onload = function (e) {
//       originalImageData = e.target.result;

//       // Wyświetlenie obrazu
//       previewImage.src = originalImageData;
//       uploadContainer.classList.add('hide');
//       previewContainer.classList.remove('hide');

//       // Inicjalizacja Cropper.js po załadowaniu obrazu
//       previewImage.onload = function () {
//         initCropper();
//         exportButton.disabled = false;
//       };
//     };

//     reader.readAsDataURL(file);
//   }

//   // Inicjalizacja Cropper.js
//   function initCropper() {
//     if (cropper) {
//       cropper.destroy();
//     }

//     cropper = new Cropper(previewImage, {
//       viewMode: 1,
//       dragMode: 'crop',
//       autoCropArea: 0.8,
//       restore: false,
//       modal: true,
//       guides: true,
//       highlight: true,
//       cropBoxMovable: true,
//       cropBoxResizable: true,
//       toggleDragModeOnDblclick: false,
//       ready: function () {
//         updateCropBoxInputs();

//         // Ustaw odpowiedni tryb w zależności od aktywnej zakładki
//         if (currentTab === 'rotate') {
//           cropper.setDragMode('move');
//         } else if (currentTab === 'effects') {
//           cropper.setDragMode('none');
//         }

//         // Inicjalizacja obsługi efektów
//         setupEffectsHandlers();
//       },
//       crop: function (event) {
//         const data = event.detail;

//         // Aktualizacja inputów tylko gdy użytkownik zmienia rozmiar ręcznie
//         if (!cropWidthInput.matches(':focus') && !cropHeightInput.matches(':focus')) {
//           cropWidthInput.value = Math.round(data.width);
//           cropHeightInput.value = Math.round(data.height);
//         }
//       }
//     });
//   }

//   // Aktualizacja inputów na podstawie aktualnego crop box
//   function updateCropBoxInputs() {
//     if (cropper) {
//       const data = cropper.getData();
//       cropWidthInput.value = Math.round(data.width);
//       cropHeightInput.value = Math.round(data.height);
//     }
//   }

//   // Obsługa zmiany szerokości przycięcia
//   cropWidthInput.addEventListener('change', function () {
//     if (cropper) {
//       const width = parseInt(this.value);
//       if (width > 0) {
//         const data = cropper.getData();
//         data.width = width;
//         cropper.setData(data);
//       }
//     }
//   });

//   // Obsługa zmiany wysokości przycięcia
//   cropHeightInput.addEventListener('change', function () {
//     if (cropper) {
//       const height = parseInt(this.value);
//       if (height > 0) {
//         const data = cropper.getData();
//         data.height = height;
//         cropper.setData(data);
//       }
//     }
//   });

//   // Obsługa zmiany proporcji
//   aspectRatioSelect.addEventListener('change', function () {
//     if (cropper) {
//       const value = this.value;
//       let aspectRatio;

//       switch (value) {
//         case '1:1':
//           aspectRatio = 1;
//           break;
//         case '4:3':
//           aspectRatio = 4 / 3;
//           break;
//         case '16:9':
//           aspectRatio = 16 / 9;
//           break;
//         default:
//           aspectRatio = NaN; // Dowolne proporcje
//       }

//       cropper.setAspectRatio(aspectRatio);
//       updateCropBoxInputs();
//     }
//   });

//   // Obsługa zmiany kąta obrotu
//   rotationAngleInput.addEventListener('change', function () {
//     if (cropper) {
//       const angle = parseInt(this.value) || 0;
//       cropper.rotateTo(angle);
//     }
//   });

//   // Obsługa przycisku obrotu w lewo
//   rotateLeftBtn.addEventListener('click', function () {
//     if (cropper) {
//       cropper.rotate(-90);
//       updateRotationAngle();
//     }
//   });

//   // Obsługa przycisku obrotu w prawo
//   rotateRightBtn.addEventListener('click', function () {
//     if (cropper) {
//       cropper.rotate(90);
//       updateRotationAngle();
//     }
//   });

//   // Obsługa przycisku odbicia poziomego
//   flipHorizontalBtn.addEventListener('click', function () {
//     if (cropper) {
//       cropper.scaleX(-cropper.getData().scaleX || -1);
//     }
//   });

//   // Obsługa przycisku odbicia pionowego
//   flipVerticalBtn.addEventListener('click', function () {
//     if (cropper) {
//       cropper.scaleY(-cropper.getData().scaleY || -1);
//     }
//   });

//   // Aktualizacja pola input z kątem obrotu
//   function updateRotationAngle() {
//     if (cropper) {
//       const data = cropper.getData();
//       rotationAngleInput.value = Math.round(data.rotate);
//     }
//   }

//   // NOWA FUNKCJA: Konfiguracja obsługi efektów
//   function setupEffectsHandlers() {
//     // Obsługa suwaków efektów
//     effectSliders.forEach(slider => {
//       const effectId = slider.id;
//       const effectName = effectId.replace('effect-', '').replace('-', '');
//       const valueDisplay = slider.parentElement.querySelector('.effect-value');

//       // Ustaw początkowe wartości
//       updateEffectValueDisplay(slider, valueDisplay);

//       // Obsługa zmiany wartości
//       slider.addEventListener('input', function () {
//         // Aktualizuj wartość w obiekcie efektów
//         if (effectName === 'hue-rotate' || effectName === 'hueRotate') {
//           effectsValues.hueRotate = parseInt(this.value);
//         } else {
//           effectsValues[effectName] = parseInt(this.value);
//         }

//         // Aktualizuj wyświetlanie wartości
//         updateEffectValueDisplay(this, valueDisplay);

//         // Zastosuj efekty
//         applyEffects();
//       });
//     });

//     // Obsługa przycisku resetowania dla każdego efektu
//     effectResetButtons.forEach(button => {
//       button.addEventListener('click', function () {
//         const effectName = this.dataset.effect;
//         const slider = document.getElementById(`effect-${effectName.replace(/([A-Z])/g, '-$1').toLowerCase()}`);

//         // Resetuj wartość efektu
//         switch (effectName) {
//           case 'blur':
//             effectsValues.blur = 0;
//             slider.value = 0;
//             break;
//           case 'brightness':
//           case 'contrast':
//           case 'saturation':
//             effectsValues[effectName] = 100;
//             slider.value = 100;
//             break;
//           case 'grayscale':
//           case 'sepia':
//             effectsValues[effectName] = 0;
//             slider.value = 0;
//             break;
//           case 'hueRotate':
//             effectsValues.hueRotate = 0;
//             slider.value = 0;
//             break;
//           case 'invert':
//             effectsValues.invert = false;
//             invertCheckbox.checked = false;
//             break;
//         }

//         // Aktualizuj wyświetlanie wartości
//         const valueDisplay = slider ? slider.parentElement.querySelector('.effect-value') : null;
//         if (valueDisplay) {
//           updateEffectValueDisplay(slider, valueDisplay);
//         }

//         // Zastosuj efekty
//         applyEffects();
//       });
//     });

//     // Obsługa checkbox dla efektu invert
//     invertCheckbox.addEventListener('change', function () {
//       effectsValues.invert = this.checked;
//       applyEffects();
//     });
//   }

//   // NOWA FUNKCJA: Aktualizacja wyświetlania wartości efektu
//   function updateEffectValueDisplay(slider, valueDisplay) {
//     if (!slider || !valueDisplay) return;

//     const effectId = slider.id;
//     let unit = '';

//     if (effectId.includes('blur')) {
//       unit = 'px';
//     } else if (effectId.includes('hue-rotate')) {
//       unit = 'deg';
//     } else {
//       unit = '%';
//     }

//     valueDisplay.textContent = `${slider.value}${unit}`;
//   }

//   // NOWA FUNKCJA: Zastosowanie wszystkich efektów do obrazu
//   function applyEffects() {
//     if (!cropper) return;

//     const canvas = cropper.getCropBoxData().width ? cropper.getCropBoxData().canvas : null;

//     console.log(canvas)

//     if (!canvas) return;

//     // Budowanie stringa CSS filter
//     let filterString = '';

//     // Dodawanie poszczególnych filtrów
//     if (effectsValues.blur > 0) {
//       filterString += `blur(${effectsValues.blur}px) `;
//     }

//     if (effectsValues.brightness !== 100) {
//       filterString += `brightness(${effectsValues.brightness}%) `;
//     }

//     if (effectsValues.contrast !== 100) {
//       filterString += `contrast(${effectsValues.contrast}%) `;
//     }

//     if (effectsValues.grayscale > 0) {
//       filterString += `grayscale(${effectsValues.grayscale}%) `;
//     }

//     if (effectsValues.saturation !== 100) {
//       filterString += `saturate(${effectsValues.saturation}%) `;
//     }

//     if (effectsValues.sepia > 0) {
//       filterString += `sepia(${effectsValues.sepia}%) `;
//     }

//     if (effectsValues.hueRotate > 0) {
//       filterString += `hue-rotate(${effectsValues.hueRotate}deg) `;
//     }

//     if (effectsValues.invert) {
//       filterString += `invert(100%) `;
//     }

//     // Zastosowanie filtrów do canvas
//     const cropperCanvas = document.querySelector('.cropper-view-box canvas');



//     if (cropperCanvas) {
//       cropperCanvas.style.filter = filterString;
//     }
//   }

//   // Obsługa eksportu obrazu
//   exportButton.addEventListener('click', function () {
//     if (!cropper) return;

//     // Pobierz oryginalny canvas z Cropper.js
//     const canvas = cropper.getCroppedCanvas({
//       minWidth: 256,
//       minHeight: 256,
//       maxWidth: 4096,
//       maxHeight: 4096,
//       fillColor: '#fff',
//       imageSmoothingEnabled: true,
//       imageSmoothingQuality: 'high',
//     });

//     if (canvas) {
//       // Tworzenie nowego canvas do zastosowania efektów
//       const finalCanvas = document.createElement('canvas');
//       finalCanvas.width = canvas.width;
//       finalCanvas.height = canvas.height;
//       const ctx = finalCanvas.getContext('2d');

//       // Zastosuj efekty do nowego canvas
//       ctx.filter = document.querySelector('.cropper-view-box canvas').style.filter;


//       ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);

//       // Konwersja canvas do bloba
//       finalCanvas.toBlob(function (blob) {
//         // Utworzenie URL dla bloba
//         const url = URL.createObjectURL(blob);

//         // Utworzenie elementu <a> do pobrania
//         const link = document.createElement('a');
//         link.download = 'edytowane-zdjecie.png';
//         link.href = url;

//         // Dodanie do DOM i kliknięcie
//         document.body.appendChild(link);
//         link.click();

//         // Usunięcie elementu i zwolnienie URL
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);

//       }, 'image/png');
//     }
//   });

//   // Inicjalizacja
//   setupImageUpload();
// });


// ##################################


