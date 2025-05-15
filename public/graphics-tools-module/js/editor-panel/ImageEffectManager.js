export default class ImageEffectManager {

  CANVAS_DATA_ATTR = "data-pixi-canvas"
  CANVAS_ID = "pixiCanvas"
  CANVAS_CLASSNAME = "pixi-canvas"

  /** @param {HTMLElement} imagePreviewContainer */
  constructor(PIXI, imagePreviewContainer) {
    this.PIXI = PIXI
    this.imagePreviewContainer = imagePreviewContainer
    this.sprite = null
    this.app = null
  }

  /** @param {HTMLImageElement} imagePreviewElement */
  async init(imagePreviewElement) {
    const { Application, Assets, Sprite } = this.PIXI;
    const app = new Application();

    await app.init({ resizeTo: this.imagePreviewContainer, backgroundAlpha: 0 });

    app.canvas.className = this.CANVAS_CLASSNAME
    app.canvas.id = this.CANVAS_ID;
    app.canvas.setAttribute(this.CANVAS_DATA_ATTR, '')

    this.imagePreviewContainer.appendChild(app.canvas);

    const texture = await Assets.load(imagePreviewElement);
    const sprite = new Sprite(texture);

    app.stage.addChild(sprite);

    function fitSpriteToContainer(sprite, container) {
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const imageRatio = sprite.width / sprite.height;
      const containerRatio = containerWidth / containerHeight;

      sprite.anchor.set(0.5);
      sprite.position.set(containerWidth / 2, containerHeight / 2);

      let scale;

      if (containerRatio > imageRatio) {
        scale = containerHeight / sprite.height;
      } else {
        scale = containerWidth / sprite.width;
      }

      sprite.scale.set(scale);
    }

    fitSpriteToContainer(sprite, this.imagePreviewContainer);

    window.addEventListener('resize', () => fitSpriteToContainer(sprite, this.imagePreviewContainer));

    sprite.filters = [];

    this.sprite = sprite
    this.app = app

    // app.ticker.add((time) =>
    //   {
    //       // Just for fun, let's rotate mr rabbit a little.
    //       // * Delta is 1 if running at 100% performance *
    //       // * Creates frame-independent transformation *
    //       sprite.rotation += 0.1 * time.deltaTime;
    //   });
  }

  /** @returns {HTMLCanvasElement} */
  getCanvas() {
    return this.app.renderer.extract.canvas(this.app.stage)
  }

  clearEffects() {
    console.log(this.sprite.filters)

    this.sprite.filters = [];
  }

  /**
   * Nakłada efekt sepii na sprite.
   * @param {number} [amount=1] – siła efektu 0–1 (0 = brak, 1 = pełna sepii).
   */
  applySepia(amount = 1) {
    const sepiaFilter = new this.PIXI.ColorMatrixFilter();

    sepiaFilter.sepia(false);

    if (amount !== 1) {
      sepiaFilter.alpha = amount;
    }
    this.sprite.filters = [
      ...this.sprite.filters || [],
      sepiaFilter
    ];
  }

  /** Usuwa efekt sepii z listy filtrów sprite. */
  removeSepia() {
    if (!this.sprite.filters) return;

    this.sprite.filters = this.sprite.filters.filter(
      f => !(f instanceof this.PIXI.ColorMatrixFilter)
    );
  }

  addBlur(blurOptions) {
    const blurFilter = new this.PIXI.BlurFilter(blurOptions);

    this.sprite.filters = [...this.sprite.filters, blurFilter];
  }

  removeBlur() {
    this.sprite.filters.forEach(element => {
      console.log(element)
    });
    this.sprite.filters.filter(filter => !filter instanceof this.PIXI.BlurFilter)

    this.sprite.filters = []
  }

  /** 
   * Funkcja dopasowująca obrazek do kontenera 
   * @param {Sprite} sprite 
   * @param {HTMLElement} container 
   */
  fitSpriteToContainer(sprite, container) {
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const imageRatio = sprite.width / sprite.height;
    const containerRatio = containerWidth / containerHeight;

    sprite.anchor.set(0.5);
    sprite.position.set(containerWidth / 2, containerHeight / 2);

    let scale;

    if (containerRatio > imageRatio) {
      scale = containerHeight / sprite.height;
    } else {
      scale = containerWidth / sprite.width;
    }

    sprite.scale.set(scale);
  }
}