export default class PieChart {
    static ID = "user-achievements-module-custom-pie-chart"

    /** @param {string}pieChartContainerSelector */
    constructor(pieChartContainerSelector) {
        this.pieChartContainerSelector = pieChartContainerSelector;
        this.container = document.querySelector(this.pieChartContainerSelector);

        if (!this.container) {
            console.warn(`${pieChartContainerSelector} element not found!`);
        } else {
            this.pieChart = this.container.querySelector("[data-pie-chart-appearance]");
            this.pieData = JSON.parse(this.pieChart.getAttribute("data-pie"));
            this.pieChartTitle = this.container.getAttribute("data-title")
            this.legendFigcaption = null
            this.init();
        }
    }

    getAppearance() {
        return this.pieChart
    }

    reRender(callback = () => {}) {
        callback()
        const stylesPieChart = document.head.querySelector(`style#${PieChart.ID}`)
        stylesPieChart?.remove()
        this.legendFigcaption?.remove()
        this.pieData = JSON.parse(this.pieChart.getAttribute("data-pie"));
        this.renderStylesForPieChart()
        this.generateLegendForPieChart();
        this.pieChart.style.animation = 'none';
        this.pieChart.offsetHeight
        this.pieChart.style.removeProperty('animation')
    }

    init() {
        this.renderStylesForPieChart()
        this.generateLegendForPieChart();
    }

    renderStylesForPieChart() {

        const stylesPieChart = document.createElement("style");

        stylesPieChart.id = PieChart.ID
        stylesPieChart.textContent = this.generateCSSForPieChart();

        document.head.append(stylesPieChart);
    }

    generateLegendForPieChart() {
        this.legendFigcaption = document.createElement("figcaption");
        this.legendFigcaption.className = "legends";

        this.pieData.data.forEach((data) => {
            const {
                percent,
                label
            } = data;
            const item = document.createElement("span");
            item.className = "legend-item";
            item.textContent = `${label} ${percent}%`;
            this.legendFigcaption.append(item);
        });

        if (this.pieChartTitle) {
            const titleSpan = document.createElement('span')
            titleSpan.textContent = this.pieChartTitle
            titleSpan.className = "legend-title"
            this.legendFigcaption.append(titleSpan)
        }

        this.container.append(this.legendFigcaption);
    }

    generateCSSForPieChart() {
        const pieChartData = this.pieData.data;
        const {
            animate,
            animationSpeed
        } = this.pieData;
        const showAnimation = animate && "registerProperty" in CSS;
        const sumOfPercents = this.pieData.data.reduce((value, obj) => obj.percent + value, 0)

        let pieCharLegendItems = "";
        let pieCharColors = "";
        let pieCharCSSOpacityProperties = "";
        let pieCharAnimationProperty = "";
        let pieCharAnimationKeyframes = "";
        let pieCharAnimationStartOpacity = "";
        let pieCharAnimationEndOpacity = "";
        let pieCharConicGradientValues = "";
        let lastProcentValue = 0;

        pieChartData.forEach((data, index) => {
            const nr = index + 1;
            const {
                color,
                percent
            } = data;
            const percentValue = percent + lastProcentValue;

            pieCharColors += `--color-${nr}: ${color};`;
            pieCharAnimationStartOpacity += `--opacity-${nr}: 0%;`;

            if (index === 0) {
                pieCharAnimationEndOpacity += `--opacity-${nr}: ${percentValue}%;`;
                pieCharConicGradientValues += showAnimation ? `var(--color-${nr}) var(--opacity-${nr}),` : `${color} ${percentValue}%,`;
            } else if (index === pieChartData.length - 1) {
                pieCharConicGradientValues += showAnimation ? `var(--color-${nr}) 0 var(--opacity-${nr})` : `${color} 0 ${percentValue}%`;
            } else {
                pieCharAnimationEndOpacity += `--opacity-${nr}: ${percentValue}%;`;
                pieCharConicGradientValues += showAnimation ? `var(--color-${nr}) 0 var(--opacity-${nr}),` : `${color} 0 ${percentValue}%,`;
            }

            pieCharLegendItems += `${this.pieChartContainerSelector} .legends .legend-item:nth-child(${nr})::before {background-color: var(--color-${nr});}`;

            if (showAnimation) {
                pieCharCSSOpacityProperties += `@property --opacity-${nr} {syntax: "<percentage>";initial-value: 100%;inherits: false;}`;
            }
            lastProcentValue = percentValue;
        });

        if (showAnimation) {
            pieCharAnimationProperty = `animation: piechart-conic-gradient-animation ${
        animationSpeed / 1000
      }s ease-in-out forwards;`;
            pieCharAnimationKeyframes = `
          @keyframes piechart-conic-gradient-animation {
            0% { ${pieCharAnimationStartOpacity} } 
            100% { ${pieCharAnimationEndOpacity} }
          }
        `;
        }

        let pieChartConicGradientBg = sumOfPercents === 0 ? '' : `background-image: conic-gradient(from 30deg, ${pieCharConicGradientValues});`

        return `
              ${pieCharCSSOpacityProperties}
  
              ${this.pieChartContainerSelector} {
                  ${pieCharColors} 
              } 
              ${this.pieChartContainerSelector} .pie-chart {
                  ${pieChartConicGradientBg}  
                  ${pieCharAnimationProperty} 
              } 
              ${pieCharAnimationKeyframes}
              ${pieCharLegendItems}
          `;
    }
}