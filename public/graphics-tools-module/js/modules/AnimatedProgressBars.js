export default class AnimatedProgressBars {
  constructor(container, selector, duration = 1000) {
    this.elements = container.querySelectorAll(selector);
    this.duration = duration;
    this.observer = null;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.animationFrames = new Map(); 
    this.init()
    this.setupMotionPreference();
  }

  init() {
    if (this.prefersReducedMotion.matches) {
      this.setValuesWithoutAnimation();
    } else {
      this.initObserver();
    }
  }

  reset() {
    this.init()
  }

  cancelAllAnimations() {
    this.animationFrames.forEach(frameId => cancelAnimationFrame(frameId));
    this.animationFrames.clear();
  }

  disconnectObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  setupMotionPreference() {
    this.prefersReducedMotion.addEventListener('change', (e) => {
      this.cancelAllAnimations();

      if (e.matches) {
        this.setValuesWithoutAnimation();
        this.disconnectObserver();
      } else {
        this.initObserver();
      }
    });
  }

  setValuesWithoutAnimation() {
    requestAnimationFrame(() => {
      this.elements.forEach(element => {
        const per = element.getAttribute("per");
        element.style.setProperty('width', `${per}%`)
        element.style.setProperty('transition', 'none')
        element.style.setProperty('transform', 'translateZ(0)')
      });
    });
  }

  initObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animateElement(entry.target);
            this.observer.unobserve(entry.target); 
          }
        });
      }, {
        threshold: 0.1
      }
    );

    this.elements.forEach(element => this.observer.observe(element));
  }

  /** 
   * @param {HTMLElement} element 
   * @param {boolean} showAnimation
   */
  animateElement(element, showAnimation = true) {
    if (this.prefersReducedMotion.matches || !showAnimation) {
      this.setValuesWithoutAnimation();
      return;
    }

    const targetValue = parseFloat(element.getAttribute("per"));
    let startTime = null;

    const animate = (timestamp) => {
      if (this.prefersReducedMotion.matches) {
        this.setValuesWithoutAnimation();
        return;
      }

      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / this.duration, 1);
      const currentValue = percentage * targetValue;

      element.style.setProperty('width', `${currentValue}%`)
      element.style.setProperty('transform', 'translateZ(0)')
      element.style.setProperty('will-change', 'width')

      if (progress < this.duration) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.set(element, frameId);
      } else {
        element.style.setProperty('width', `${targetValue}%`)
        element.style.setProperty('transform', 'translateZ(0)')
        this.animationFrames.delete(element);
      }
    };

    requestAnimationFrame(animate);
  } 
}
