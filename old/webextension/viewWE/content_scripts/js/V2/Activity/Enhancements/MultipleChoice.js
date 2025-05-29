export default class MultipleChoice {
  enhance(node) {
    node.classList.add('colorize-style-agreement');
  }

  clear(node) {
    node.classList.remove('colorize-style-agreement');
  }
}
