export default class ImageEffectManager {

  /** @param {HTMLImageElement} imagePreviewContainer  */
  /** @param {HTMLImageElement} imagePreviewElement  */
  constructor(PIXI, imagePreviewContainer, imagePreviewElement) {
    this.PIXI = PIXI
    this.imagePreviewElement = imagePreviewElement
    this.imagePreviewContainer = imagePreviewContainer

  }

  /** @param {string} src - w formacie base64  */
  async init(src) {
    // const app = new this.PIXI.Application({
    //   width: 1000,
    //   height: 500
    // });
    // this.imagePreviewContainer.appendChild(app.view); 

    // const image = this.PIXI.Sprite.from(src);

    // app.stage.addChild(image);

    // image.filters = []

    // setTimeout(() => {
    //   const blurFilter = new this.PIXI.BlurFilter(5);
    //   image.filters = [blurFilter];

    //   const colorMatrix = new this.PIXI.ColorMatrixFilter();
    //   colorMatrix.sepia(true);
    //   image.filters.push(colorMatrix);
    // }, 4000)

    const {Application, Assets, Sprite} = this.PIXI

    // Create a new application
    const app = new Application({ background: '#1099bb', resizeTo: this.imagePreviewContainer });

    

    // Append the application canvas to the document body
    this.imagePreviewContainer.appendChild(app.view);

    console.log(Assets) 

    // Load the bunny texture
    const texture = await Assets.load('https://pixijs.com/assets/bunny.png');

    // Create a bunny Sprite
    const bunny = new Sprite(texture);

    // Center the sprite's anchor point
    bunny.anchor.set(0.5);

    // Move the sprite to the center of the screen
    bunny.x = app.screen.width / 2;
    bunny.y = app.screen.height / 2;

    app.stage.addChild(bunny);

    // Listen for animate update
    app.ticker.add((time) =>
    {
        // Just for fun, let's rotate mr rabbit a little.
        // * Delta is 1 if running at 100% performance *
        // * Creates frame-independent transformation *
        bunny.rotation += 0.1 * time.deltaTime;
    });
  }
}