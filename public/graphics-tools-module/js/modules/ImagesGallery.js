import printImage from "../utils/printImage.js";

export default class ImagesGalleryModal extends HTMLElement {

  static IMAGES_PREVIEWS_RERENDERED_EVENT = "gallery-images-previews-rerendered-event"

  constructor() {
    super()
  }

  connectedCallback() {
    this.imagePreviews = [];
    this.itemsPerPage = 12;
    this.currentImageIndex = 0;
    this.isFullscreenActive = false

    this.render();
    this.init();
  }

  render() {
    this.className = "images-gallery";
    this.innerHTML = `
            <div class="gallery-modal" id="galleryModal">
                <div class="gallery-content">
                    <div class="gallery-options">

                      <button data-gallery-maximize-btn class="gallery-option-btn">
                        <span class="sr-only">Pokaż w dużym trybie</span>
                        <i class="fa-solid fa-expand"></i>
                      </button>

                      <button data-gallery-minimize-btn class="gallery-option-btn" style="display: none;">
                        <span class="sr-only">Pokaż w małym trybie</span>
                        <i class="fa-solid fa-compress"></i>
                      </button>

                      <button data-gallery-print-btn class="gallery-option-btn">
                        <span class="sr-only">Wydrukuj zdjęcie</span>
                        <i class="fa-solid fa-print"></i>
                      </button>
                      
                      <a download data-gallery-download-btn class="gallery-option-btn">
                        <span class="sr-only">Pobierz zdjęcie</span>
                        <i class="fa-solid fa-download"></i>
                      </a>

                    </div>

                    <div class="gallery-others">

                      <div class="gallery-counter" id="galleryCounter">1/1</div>

                      <button class="gallery-close" id="galleryClose">
                        <span class="sr-only">Zamknij galerie</span>
                        <i class="fa-solid fa-xmark"></i>
                      </button>

                    </div>  

                    <button class="gallery-nav gallery-prev" id="galleryPrev">
                      <span class="sr-only">Poprzednie zdjęcie</span>
                      <i class="fa-solid fa-chevron-left"></i>
                    </button>

                    <button class="gallery-nav gallery-next" id="galleryNext">
                      <span class="sr-only">Następne zdjęcie</span>
                      <i class="fa-solid fa-chevron-right"></i>
                    </button>

                    <div class="gallery-thumbnails" id="galleryThumbnails"></div>

                </div>
            </div>
        `
  }

  addEventListeners() {

    document.addEventListener(ImagesGalleryModal.IMAGES_PREVIEWS_RERENDERED_EVENT, (e) => this.initAgainImagePreviews())

    this.galleryPrevBtn.addEventListener('click', () => this.showImage(this.currentImageIndex - 1));

    this.galleryNextBtn.addEventListener('click', () => this.showImage(this.currentImageIndex + 1));

    this.galleryCloseBtn.addEventListener('click', () => {

      if (galleryModal) {
        galleryModal.style.transition = 'opacity 0.3s ease';
        galleryModal.style.opacity = '0';

        setTimeout(() => {
          galleryModal.style.display = 'none';
          galleryModal.style.removeProperty('opacity');
        }, 300);
      }

      document.body.style.overflow = 'auto';
    });

    this.galleryPrintBtn.addEventListener('click', (e) => printImage(e.target.dataset.src))

    this.galleryMaximizeBtn.addEventListener('click', (e) => {
      if (this.galleryMinimizeBtn.style.display === 'none') {
        e.target.style.display = 'none'
        this.galleryMinimizeBtn.style.display = ''
        this.activeFullScreen()
      }
    })

    this.galleryMinimizeBtn.addEventListener('click', (e) => {
      if (this.galleryMaximizeBtn.style.display === 'none') {
        e.target.style.display = 'none'
        this.galleryMaximizeBtn.style.display = ''
        this.inactiveFullScreen()
      }
    })

    document.addEventListener('click', (e) => {
      const target = e.target

      if (target.hasAttribute('data-gallery-preview')) {
        e.preventDefault()
        this.openGallery(parseInt(target.dataset.galleryPreview))
      } 
    })

    // Close gallery with escape key
    document.addEventListener('keydown', (e) => {
      const isVisible = galleryModal && window.getComputedStyle(galleryModal).display !== 'none';

      if (e.key === 'Escape' && isVisible) {
        galleryModal.style.transition = 'opacity 0.3s ease';
        galleryModal.style.opacity = '0';

        setTimeout(() => {
          galleryModal.style.display = 'none';
        }, 300);

        document.body.style.overflow = 'auto';
      }

      if (isVisible) {
        if (e.key === 'ArrowLeft') {
          this.showImage(this.currentImageIndex - 1);
        } else if (e.key === 'ArrowRight') {
          this.showImage(this.currentImageIndex + 1);
        }
      }
    });
  }

  init() {
    this.galleryPrevBtn = this.querySelector('#galleryPrev')
    this.galleryNextBtn = this.querySelector('#galleryNext')
    this.galleryCloseBtn = this.querySelector('#galleryClose')
    this.galleryModal = this.querySelector('#galleryModal');

    this.galleryPrintBtn = this.querySelector('[data-gallery-print-btn]')
    this.galleryDownloadBtn = this.querySelector('[data-gallery-download-btn]')
    this.galleryMaximizeBtn = this.querySelector('[data-gallery-maximize-btn]')
    this.galleryMinimizeBtn = this.querySelector('[data-gallery-minimize-btn]')
    this.imagePreviews = document.querySelectorAll('[data-gallery-preview]')

    this.imagePreviews.forEach((imgPrev, index) => imgPrev.setAttribute('data-gallery-preview', this.imagePreviews.length - (index + 1)))

    this.addEventListeners()
  }

  initAgainImagePreviews() {
    this.imagePreviews = document.querySelectorAll('[data-gallery-preview]')
    this.imagePreviews.forEach((imgPrev, index) => imgPrev.setAttribute('data-gallery-preview', this.imagePreviews.length - (index + 1)))

    console.log('initAgainImagePreviews()')
  }

  openGallery(index) {
    this.currentImageIndex = index;
    const galleryContent = this.querySelector('#galleryModal .gallery-content');
    const galleryThumbnailsContainer = this.querySelector('#galleryThumbnails')

    // Clear existing images
    galleryContent.querySelectorAll('.gallery-image').forEach(img => img.remove())

    galleryThumbnailsContainer.innerHTML = ""

    // Add all images to gallery
    const imagePreviewsArray = [...this.imagePreviews]
    imagePreviewsArray.reverse().forEach((imagePreview, idx) => {
      const imageElement = document.createElement('img');

      imageElement.src = imagePreview.dataset.src
      imageElement.className = "gallery-image"

      galleryContent.prepend(imageElement);

      // Add thumbnail
      const thumbnail = document.createElement('img');

      thumbnail.src = imagePreview.dataset.src
      thumbnail.className = "gallery-thumbnail"

      galleryThumbnailsContainer.append(thumbnail);

      // Add click event to thumbnail
      thumbnail.addEventListener('click', () => {
        console.log(`this.showImage(${idx + 1})`)
        this.showImage(idx + 1)
      })
    });

    // Show the modal
    const modal = this.querySelector('#galleryModal');

    modal.style.opacity = '0';
    modal.style.display = 'block';
    modal.style.transition = 'opacity 0.3s ease';

    requestAnimationFrame(() => modal.style.opacity = '1');

    // Show the current image
    this.showImage(this.currentImageIndex);

    // Prevent scrolling of body
    document.body.style.overflow = "hidden"
  }

  activeFullScreen() {
    const galleryImages = this.querySelectorAll('.gallery-image') 

    galleryImages.forEach(image => image.classList.add('fullscreen'))
  }

  inactiveFullScreen() {
    const galleryImages = this.querySelectorAll('.gallery-image') 

    galleryImages.forEach(image => image.classList.remove('fullscreen'))
  }

  showImage(index) {
    const galleryImages = this.querySelectorAll('.gallery-image')
    const galleryThumbnails = this.querySelectorAll('.gallery-thumbnail')
    const galleryCounter = this.querySelector('#galleryCounter')

    if (index < 0) index = this.imagePreviews.length - 1;
    if (index >= this.imagePreviews.length) index = 0;

    this.currentImageIndex = index;

    galleryImages.forEach(image => {
      if (image.classList.contains('active')) {
        image.classList.remove('active')
      }
    })

    galleryThumbnails.forEach(thumbnail => {
      if (thumbnail.classList.contains('active')) {
        thumbnail.classList.remove('active')
      }
    })

    galleryImages[index]?.classList.add('active');
    galleryThumbnails[index]?.classList.add('active');

    this.galleryPrintBtn.setAttribute('data-src', galleryImages[index]?.src)
    this.galleryDownloadBtn.href = galleryImages[index]?.src

    galleryCounter.textContent = `${index + 1} / ${this.imagePreviews.length}`
  }
}

customElements.define('images-gallery-modal', ImagesGalleryModal)