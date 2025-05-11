class CircularProgressBar {
  static DEFAULT_OPTIONS = {
    colorSlice: "#00a1ff",
    fontColor: "#000",
    fontSize: "1.6rem",
    fontWeight: 400,
    lineargradient: false,
    number: true,
    round: false,
    fill: "none",
    unit: "%",
    rotation: -90,
    size: 200,
    stroke: 10,
  };

  /**
   * @param {string} pieName
   * @param {object} globalObj
   */
  constructor(pieName, globalObj = {}) {
    this._className = pieName;
    this._globalObj = globalObj;

    const pieElements = document.querySelectorAll(`.${pieName}`);
    const elements = [].slice.call(pieElements);
    // add index to all progressbar
    elements.map((item, idx) => {
      const id = JSON.parse(item.getAttribute("data-pie"));
      item.setAttribute("data-pie-index", id.index || globalObj.index || idx + 1);
    });

    this._elements = elements;
  }

  initial(outside) {
    const triggeredOutside = outside || this._elements;
    Array.isArray(triggeredOutside) ?
      triggeredOutside.map((element) => this._createSVG(element)) :
      this._createSVG(triggeredOutside);
  }

  _progress(svg, target, options) {
    const pieName = this._className;
    if (options.number) {
      this._insertAdElement(svg, this._percent(options, pieName));
    }

    const progressCircle = this._querySelector(`.${pieName}-circle-${options.index}`);

    const configCircle = {
      fill: "none",
      "stroke-width": options.stroke,
      "stroke-dashoffset": "264",
      ...this._strokeDasharray(),
      ...this._strokeLinecap(options),
    };
    this._setAttribute(progressCircle, configCircle);

    // animation progress
    this.animationTo({ ...options, element: progressCircle, }, true);

    // set style and rotation
    progressCircle.setAttribute("style", this._styleTransform(options));

    // set color
    this._setColor(progressCircle, options);

    // set width and height on div
    target.setAttribute("style", `width:${options.size}px;height:${options.size}px;`);
  }

  animationTo(options, initial = false) {
    const pieName = this._className;
    const previousConfigObj = JSON.parse(
      this._querySelector(`[data-pie-index="${options.index}"]`).getAttribute(
        "data-pie"
      )
    );

    const circleElement = this._querySelector(`.${pieName}-circle-${options.index}`);

    if (!circleElement) return;

    // merging all configuration objects
    const commonConfiguration = initial ?
      options : {
        ...CircularProgressBar.DEFAULT_OPTIONS,
        ...previousConfigObj,
        ...options,
        ...this._globalObj,
      };

    // update color circle
    if (!initial) {
      this._setColor(circleElement, commonConfiguration);
    }

    // font color update
    if (!initial && commonConfiguration.number) {
      const fontconfig = {
        fill: commonConfiguration.fontColor,
        ...this._fontSettings(commonConfiguration),
      };
      const textElement = this._querySelector(
        `.${pieName}-text-${commonConfiguration.index}`
      );
      this._setAttribute(textElement, fontconfig);
    }

    const centerNumber = this._querySelector(
      `.${pieName}-percent-${options.index}`
    );

    if (commonConfiguration.animationOff) {
      if (commonConfiguration.number)
        centerNumber.textContent = `${commonConfiguration.percent}`;
      circleElement.setAttribute(
        "stroke-dashoffset",
        this._dashOffset(
          commonConfiguration.percent *
          ((100 - (commonConfiguration.cut || 0)) / 100),
          commonConfiguration.inverse
        )
      );
      return;
    }

    // get numer percent from data-angel
    let angle = JSON.parse(circleElement.getAttribute("data-angel"));

    // round if number is decimal
    const percent = Math.round(options.percent);

    // if percent 0 then set at start 0%
    if (percent === 0) {
      if (commonConfiguration.number) centerNumber.textContent = "0";
      circleElement.setAttribute("stroke-dashoffset", "264");
    }

    if (percent > 100 || percent < 0 || angle === percent) return;

    let request;
    let i = initial ? 0 : angle;

    const fps = commonConfiguration.speed || 1000;
    const interval = 1000 / fps;
    const tolerance = 0.1;
    let then = performance.now();

    const performAnimation = (now) => {
      request = requestAnimationFrame(performAnimation);
      const delta = now - then;

      if (delta >= interval - tolerance) {
        then = now - (delta % interval);

        // angle >= commonConfiguration.percent ? i-- : i++;
        i = i < commonConfiguration.percent ? i + 1 : i - 1;
      }

      circleElement.setAttribute(
        "stroke-dashoffset",
        this._dashOffset(
          i,
          commonConfiguration.inverse,
          commonConfiguration.cut
        )
      );
      if (centerNumber && commonConfiguration.number) {
        centerNumber.textContent = `${i}`;
      }

      circleElement.setAttribute("data-angel", i);
      circleElement.parentNode.setAttribute("aria-valuenow", i);

      if (i === percent) {
        cancelAnimationFrame(request);
      }
    };

    requestAnimationFrame(performAnimation);
  }

  _createSVG(element) {
    const index = element.getAttribute("data-pie-index");
    const json = JSON.parse(element.getAttribute("data-pie"));

    const options = {
      ...CircularProgressBar.DEFAULT_OPTIONS,
      ...json,
      index,
      ...this._globalObj,
    };

    const svg = this._createNSElement("svg");

    const configSVG = {
      role: "progressbar",
      width: options.size,
      height: options.size,
      viewBox: "0 0 100 100",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
    };

    this._setAttribute(svg, configSVG);

    // colorCircle
    if (options.colorCircle) {
      svg.appendChild(this._circle(options));
    }

    // gradient
    if (options.lineargradient) {
      svg.appendChild(this._gradient(options));
    }

    svg.appendChild(this._circle(options, "top"));

    element.appendChild(svg);

    this._progress(svg, element, options);
  }

  _circle(options, where = "bottom") {
    const circle = this._createNSElement("circle");

    let configCircle = {};
    if (options.cut) {
      const dashoffset = 264 - (100 - options.cut) * 2.64;
      configCircle = {
        "stroke-dashoffset": options.inverse ? -dashoffset : dashoffset,
        style: this._styleTransform(options),
        ...this._strokeDasharray(),
        ...this._strokeLinecap(options),
      };
    }

    const objCircle = {
      fill: options.fill,
      stroke: options.colorCircle,
      "stroke-width": options.strokeBottom || options.stroke,
      ...configCircle,
    };

    if (options.strokeDasharray) {
      Object.assign(objCircle, {
        ...this._strokeDasharray(options.strokeDasharray),
      });
    }

    const typeCircle =
      where === "top" ? {
        class: `${this._className}-circle-${options.index}`,
      } :
      objCircle;

    const objConfig = {
      cx: "50%",
      cy: "50%",
      r: 42,
      "shape-rendering": "geometricPrecision",
      ...typeCircle,
    };

    this._setAttribute(circle, objConfig);

    return circle;
  }

  _styleTransform = ({
    rotation,
    animationSmooth
  }) => {
    const smoothAnimation = animationSmooth ?
      `transition: stroke-dashoffset ${animationSmooth}` :
      "";

    return `transform:rotate(${rotation}deg);transform-origin: 50% 50%;${smoothAnimation}`;
  };

  _strokeDasharray = (type) => {
    return {
      "stroke-dasharray": type || "264",
    };
  };

  _strokeLinecap = ({
    round
  }) => {
    return {
      "stroke-linecap": round ? "round" : "",
    };
  };

  _fontSettings = (options) => {
    return {
      "font-size": options.fontSize,
      "font-weight": options.fontWeight,
    };
  };

  _querySelector = (element) => document.querySelector(element);

  _setColor = (element, {
    lineargradient,
    index,
    colorSlice
  }) => {
    element.setAttribute(
      "stroke",
      lineargradient ? `url(#linear-${index})` : colorSlice
    );
  };

  _setAttribute = (element, object) => {
    for (const key in object) {
      element?.setAttribute(key, object[key]);
    }
  };

  _createNSElement = (type) => document.createElementNS("http://www.w3.org/2000/svg", type);

  _tspan = (className, unit) => {
    const element = this._createNSElement("tspan");

    element.classList.add(className);
    if (unit) element.textContent = unit;
    return element;
  };

  _dashOffset = (count, inverse, cut) => {
    const cutChar = cut ? (264 / 100) * (100 - cut) : 264;
    const angle = 264 - (count / 100) * cutChar;

    return inverse ? -angle : angle;
  };

  _insertAdElement = (element, el, type = "beforeend") =>
    element.insertAdjacentElement(type, el);

  _gradient = ({
    index,
    lineargradient
  }) => {
    const defsElement = this._createNSElement("defs");
    const linearGradient = this._createNSElement("linearGradient");
    linearGradient.id = `linear-${index}`;

    const countGradient = [].slice.call(lineargradient);

    defsElement.appendChild(linearGradient);

    let number = 0;
    countGradient.map((item) => {
      const stopElements = this._createNSElement("stop");

      const stopObj = {
        offset: `${number}%`,
        "stop-color": `${item}`,
      };
      this._setAttribute(stopElements, stopObj);

      linearGradient.appendChild(stopElements);
      number += 100 / (countGradient.length - 1);
    });

    return defsElement;
  };

  _percent = (options, className) => {
    const creatTextElementSVG = this._createNSElement("text");

    creatTextElementSVG.classList.add(`${className}-text-${options.index}`);

    // create tspan element with number and insert to svg text element
    this._insertAdElement(
      creatTextElementSVG,
      this._tspan(`${className}-percent-${options.index}`)
    );

    // create and insert unit to text element
    this._insertAdElement(
      creatTextElementSVG,
      this._tspan(`${className}-unit-${options.index}`, options.unit)
    );

    // config to svg text
    const obj = {
      x: "50%",
      y: "50%",
      fill: options.fontColor,
      "text-anchor": "middle",
      dy: options.textPosition || "0.35em",
      ...this._fontSettings(options),
    };

    this._setAttribute(creatTextElementSVG, obj);
    return creatTextElementSVG;
  };
}

export default class CircularProgressBarElement extends HTMLElement {

  dataPie
  percentValue
  labelText
  size
  circle
  pieElement
  isInitialized = false;

  static get observedAttributes() {
    return ["data-percent"];
  }

  constructor() {
    super();
  }

  connectedCallback() {
    this.dataPie = this.getAttribute("data-pie");
    this.percent = Number(this.getAttribute("data-percent"));
    this.labelText = this.getAttribute("data-label") ?? "";
    this.size = this.getAttribute("data-size") ?? 150;
    this.render();
    this.init();
    this.isInitialized = true;
  }

  init() {
    this.pieElement = this.querySelector(".pie")
    this.circle = new CircularProgressBar("pie", {
      size: this.size,
    });
    this.circle.initial(this.pieElement);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (this.isInitialized && name === "data-percent" && oldValue !== newValue) {
      this.reanimateComponent(newValue);
    }
  }

  /** @param {string} percentStr */
  reanimateComponent(percentStr) {
    const index = this.pieElement.getAttribute('data-pie-index')

    this.circle.animationTo({
      index,
      percent: percentStr
    });
  }

  render() {
    this.innerHTML = `
        <div class="circular-progress-bar">
          <div class="pie" data-percent="${this.percent}" data-pie='${this.dataPie}' data-pie-index="0">
            <meter class="visually-hidden" id="circular-progress-bar-label" value="${this.percent / 100.0}">${this.percent}%</meter>
          </div> 
          <label class="progress-desc" for="circular-progress-bar-label">${this.labelText}</label>
        </div>
      `
  }
}

customElements.define("circular-progress-bar", CircularProgressBarElement);