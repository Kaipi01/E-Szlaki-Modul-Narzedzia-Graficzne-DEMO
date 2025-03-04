import PIXI from "./libs/pixi-modules.min.js";
import Cropper from "./libs/cropper.min.js"; 

console.log('hello main-panel.js !')

document.addEventListener('DOMContentLoaded', () => {

    try {
        initTestPixiLib()
    } catch (e) {
        console.error(e)
    } 

    const cropImage = document.querySelector('#image-test'); // Element img

    // Initialize cropper when the image is loaded
    if (cropImage.complete) {
        initCropper();
    } else {
        cropImage.onload = initCropper;
    }

    function initCropper() {
        // For Cropper.js 2.0.0, we need to use the correct initialization
        const cropper = new Cropper(cropImage, {
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
})

function initTestPixiLib() {
    const moduleContainer = document.querySelector('#graphics-tools-module > .modern-card')
    const app = new PIXI.Application({
        width: 1000,
        height: 500
    });
    moduleContainer.appendChild(app.view);

    // Załaduj obraz
    // const image = PIXI.Sprite.from('./images/place-img-2.webp');
    const image = PIXI.Sprite.from('/GraphicsToolsModule/images/place-img-2.webp');
    
    app.stage.addChild(image);

    image.filters = []

    setTimeout(() => {
        // Dodaj efekt blur
        const blurFilter = new PIXI.BlurFilter(5);
        image.filters = [blurFilter];

        // Dodaj efekt sepia
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