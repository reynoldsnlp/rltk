// Helper class to apply style sheets

export default class Css {
  constructor() {
    this.indices = [];
    const style = document.createElement('style');
    document.body.prepend(style);
    this.styleSheet = document.styleSheets[document.styleSheets.length -1];
  }

  apply(css) {
    this.indices.push(this.styleSheet.insertRule(css));
  }

  remove() {
    const styleSheet = this.styleSheet;
    this.indices.forEach(index => styleSheet.deleteRule(index));
  }
}
