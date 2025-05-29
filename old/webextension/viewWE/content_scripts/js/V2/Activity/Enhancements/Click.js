import { Observable } from 'rxjs/Observable';
import Css from './Css';

function checkAnswer(enhancement) {
  return enhancement.getAttribute('data-view-selected') === "true"
    ? 'view-click-correct'
    : 'view-click-incorrect';
}

const hoverCss = `viewEnhancement:hover {
  box-shadow: 0px 0px 5px 0px rgba(180, 100, 0, 0.2);
  background-color: rgba(180, 100, 0, 0.2);
}`;
const pointerCss = 'viewEnhancement { cursor: pointer; }';

export default class Click {
  constructor() {
    this.allEnhancements = [];
    const addEnhancement = this.addEnhancement.bind(this);
    this.clickStream = Observable.fromEvent(document, 'click')
      .filter(event => event.target.tagName === 'VIEWENHANCEMENT')
      .map(event => event.target)
      .subscribe(enhancement => addEnhancement(enhancement));
    this.css = new Css();
    this.css.apply(hoverCss);
    this.css.apply(pointerCss);
  }

  addEnhancement(enhancement) {
    this.allEnhancements.push(enhancement);
    enhancement.classList.add(checkAnswer(enhancement));
  }

  enhance(node) {
    node.setAttribute('data-view-selected', true);
  }

  clear(node) {
    node.removeAttribute('data-view-selected');
  }

  destroy() {
    this.css.remove();
    this.clickStream.unsubscribe();
    this.allEnhancements.forEach(
      enhancement => enhancement.classList.remove(
        'view-click-incorrect',
        'view-click-correct'
      )
    );
  }
}
