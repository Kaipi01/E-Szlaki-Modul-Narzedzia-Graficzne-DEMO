import AbstractPanel from "../modules/AbstractPanel.js"
import { loadModule } from "../utils/lazyImportModule.js";

export default class EditorPanel extends AbstractPanel {

  /**
   * @param {HTMLElement | string} container
   * @param {Object} options - Opcje konfiguracyjne
   * @param {string} options.saveImageUrl - URL endpointu do zapisania obrazu
   * @param {string} options.getImageDataUrl - URL endpointu do pobrania danych obrazu 
   * @param {number} options.maxFileSize - Maksymalny rozmiar pliku w bajtach
   * @param {Array}  options.allowedTypes - Dozwolone typy plików
   *
   * @typedef {Object} EditorState
   * @property {object | null} image - Aktualny obraz.
   */
  constructor(container, options = {}) {
    super(container);

    // biblioteki
    this.libs = [
        { url: "/graphics-tools-module/js/libs/pixi-modules.min.js", prop: "PIXI" },
        { url: "/graphics-tools-module/js/libs/cropper.min.js", prop: "Cropper" }
    ];
    this.PIXI = null;
    this.Cropper = null;

    /** @type {EditorState} */
    this.state = {
      image: null,
    };

    this.editorContainer = this.getByAttribute('data-editor-container')

    this.editorLoading = this.getByAttribute('data-editor-loading')
    this.editorLoadingProgress = this.getByAttribute('data-editor-loading-progress')
    this.editorLoadingProgressBar = this.editorLoadingProgress.querySelector('[data-progress-bar]')
    this.editorLoadingProgressText = this.editorLoadingProgress.querySelector('[data-progress-text]')
    this.editorLoadingProgressLabel = this.editorLoadingProgress.querySelector('[data-progress-label]')

    this.editorContainer.style.display = "none" 

    // Leniwe zaimportowanie ciężkich bibliotek jak PIXI i Cropper
    this.importLibModules(() => {
        this.editorLoading.style.display = "none";
        this.editorContainer.style.display = "";
    
        const imgEl = document.querySelector('#image-test');
    
        if (imgEl) this.initCropper(imgEl);
    
        // try {
        //     initTestPixiLib()
        // } catch (e) {
        //     console.error(e)
        // } 
    })
  }

  async importLibModules(onImportedSuccessfully) { 
    const onChunkLoadedProgress = (percent, moduleName) => {
        this.editorLoadingProgressBar.setAttribute('per', percent)
        this.editorLoadingProgressBar.style.width = `${percent}%`;
        this.editorLoadingProgressText.textContent = `${percent}%`;
        this.editorLoadingProgressLabel.textContent = `Pobieranie modułu: ${moduleName}`;
    }

    // ładujemy je sekwencyjnie 
    for (let { url, prop } of this.libs) {
      this[prop] = await loadModule(url, prop, onChunkLoadedProgress);
    } 

    // Poczekaj aż animacja paska postępu się skończy
    setTimeout(onImportedSuccessfully, 1000) 
  } 

  initCropper(cropImage) {

    if (!this.Cropper) {
      console.error("Cropper nie jest załadowany!");
      return;
    }

    const cropper = new this.Cropper(cropImage, {
      viewMode: 1, // No restrictions
      dragMode: 'move',
      aspectRatio: 16 / 9,
      autoCropArea: 0.9,
      restore: true,
      modal: true,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
    });

    console.log('Cropper initialized:', cropper);

  }

  initTestPixiLib() {
    const moduleContainer = document.querySelector('#graphics-tools-module > .modern-card')
    const app = new PIXI.Application({
      width: 1000,
      height: 500
    });
    moduleContainer.appendChild(app.view);

    const image = PIXI.Sprite.from('/graphics-tools-module/images/place-img-2.webp');

    app.stage.addChild(image);

    image.filters = []

    setTimeout(() => {
      const blurFilter = new PIXI.BlurFilter(5);
      image.filters = [blurFilter];

      const colorMatrix = new PIXI.ColorMatrixFilter();
      colorMatrix.sepia(true);
      image.filters.push(colorMatrix);

      console.log(PIXI)
    }, 4000)
  }

  // document.querySelector('#important-form').addEventListener('submit', (e) => {
  //     processImportantForm(e.target)
  // })

  // /** @param {HTMLFormElement} form  */
  // function processImportantForm(form) {
  //     if (!isFormValid(form)) {
  //         import("./modules/CustomModal.js").then((module) => {
  //             const CustomModal = module.default;
  //             new CustomModal("Walidacja jest nie poprawna! Popraw wszystkie pola!");
  //         });
  //     } else {
  //         nextProcess()
  //     }
  // }

  // let CustomModalPromise;

  // function processImportantForm(form) {
  //     if (!isFormValid(form)) {
  //         if (!CustomModalPromise) {
  //             CustomModalPromise = import("./modules/CustomModal.js");
  //         }

  //         CustomModalPromise.then((module) => {
  //             const CustomModal = module.default;
  //             new CustomModal("Walidacja jest nie poprawna! Popraw wszystkie pola!");
  //         });
  //     } else {
  //         nextProcess();
  //     }
  // }
}

//daj mi przykład użycia w którym importuje 4 modułu z różnych miejsc 


  //   async loadSingleLib(url, classProp) {
  //     // resetuj pasek
  //     this.editorLoadingProgressBar.setAttribute('per', 0)
  //     this.editorLoadingProgressText.textContent = "0%";
  //     this.editorLoadingProgressBar.style.width = "0%";

  //     try {
  //       const module = await importModuleWithProgress(url, percent => {
  //         console.log(percent)
  //         this.editorLoadingProgressBar.setAttribute('per', percent)
  //         this.editorLoadingProgressBar.style.width = `${percent}%`;
  //         this.editorLoadingProgressText.textContent = percent + "%";
  //       });

  //       console.log(module)

  //       // większość UMD/babelowanych modułów trafia do default
  //       this[classProp] = module.default || module;
  //       console.log(`${classProp} załadowany:`, this[classProp]);

  //     } catch (err) {
  //       console.error(`Błąd ładowania ${classProp}:`, err);
  //       // tu możesz pokazać komunikat użytkownikowi
  //       throw err;
  //     }
  //   }