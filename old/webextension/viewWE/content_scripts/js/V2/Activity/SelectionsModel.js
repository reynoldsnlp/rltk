import { Observable } from 'rxjs/Observable';

export function connectSelections(baseSelections, view) {
  return Observable.fromEvent(view.querySelectorAll('input'), 'change')
    .map(event => {
      const input = event.target;
      const selectionIndex = input.getAttribute('data-selection-index');
      const itemIndex = input.getAttribute('data-item-index');

      return { selectionIndex, itemIndex, checked: input.checked };
    })
    .scan((oldSelections, { selectionIndex, itemIndex, checked }) => {
      const newSelections = JSON.parse(JSON.stringify(oldSelections));
      newSelections[selectionIndex].selectionItems[itemIndex].checked = checked;
      return newSelections;
    }, baseSelections)
    .startWith(baseSelections);
};

export function connectActivities(activityList) {
  return Observable.fromEvent(activityList, 'change')
    .map(event => event.target.value)
    .startWith(activityList.value);
};
