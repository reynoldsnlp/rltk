const createInput = () => {
  const input = document.createElement('input');
  input.classList.add('cloze-style-input');
  input.classList.add('view-input');
  input.setAttribute('type', 'text');
  return input;
};

export default class Cloze {
  constructor() {
    this.last = {};
  }

  enhance(node) {
    node.innerHTML = '';
    const input = createInput();
    node.append(input);
    const clearNode = () => this.clear(node);

    const lemma = node.getAttribute('data-lemma');
    if (typeof lemma === 'string') { // null and undefined aren't 'string'
      input.setAttribute('placeholder', lemma);
    }
    this.last['data-view-next'] = input;
    input['data-view-previous'] = this.last;
    this.last = input;
    node.classList.add('wide');

    input.onchange = () => {
      const correctAnswer = node.getAttribute('data-original-text');
      if (correctAnswer === input.value) {
        console.log('input', input);
        clearNode();
        node.classList.add('view-cloze-correct');
        const next = input['data-view-next'];
        const previous = input['data-view-previous'];
        if (next) {
          window.setTimeout(() => next.focus(), 500);
        }
        if (next && previous) {
          next['data-view-previous'] = previous;
          previous['data-view-next'] = next;
        }
      } else {
        input.classList.add('view-cloze-incorrect');
      }
    };
  }

  clear(node) {
    node.classList.remove('wide');
    node.innerHTML = '';
    node.textContent = node.getAttribute('data-original-text');
  }
}
