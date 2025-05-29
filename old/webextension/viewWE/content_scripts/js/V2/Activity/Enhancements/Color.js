export default class Color {
  constructor(topic, language) {
    this.topic = topic;
    this.language = language;
  }

  enhance(node) {
    node.classList.add(`view-colorize-${this.topic}-${this.language}-style`);
  }

  clear(node) {
    node.classList.remove(`view-colorize-${this.topic}-${this.language}-style`,);
  }
}
