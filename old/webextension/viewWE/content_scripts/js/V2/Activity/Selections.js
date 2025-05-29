import { Observable } from 'rxjs/Observable';

import { combineStore } from '../Store';
import render from './SelectionsView';
import { connectSelections, connectActivities } from './SelectionsModel';
import ActivityPicker from '../ActivityPicker';

/**
 * Renders the given view into the given container.
 *
 * Additionally, creates a show & hide button. The show button is inserted into
 * the base container, the show button is inserted into the view.
 *
 * Return value is the destruction function. It unsubscribes from the event
 * stream created for the buttons, and removes the hide button and the view from
 * the container.
 */
function createView(container, view) {
  const showButton = document.createElement('button');
  showButton.textContent = 'selections';

  const hideButton = document.createElement('button');
  hideButton.textContent = 'OK';

  function showSelections() {
    container.append(view);
    container.removeChild(showButton);
  }

  function hideSelections() {
    container.append(showButton);
    container.removeChild(view);
  }

  view.append(hideButton);
  container.append(showButton);

  const subscription = Observable.merge(
    Observable.fromEvent(showButton, 'click').map(() => showSelections),
    Observable.fromEvent(hideButton, 'click').map(() => hideSelections)
  ).startWith(showSelections).subscribe(f => f());

  return () => {
    subscription.unsubscribe();
    container.contains(view) && container.removeChild(view);
    container.contains(showButton) && container.removeChild(showButton);
  };
}

export default (commands, container) => {
  let destroyView = () => 0;
  return commands.flatMap(({ command, configuration }) => {
    destroyView();
    destroyView = () => 0;

    if (command === 'stop') {
      return Observable.empty();
    }

    const { activities, selections } = configuration;
    const activitySelect = ActivityPicker(activities, Object.keys(activities)[0]);

    const html = render(activitySelect, selections);
    destroyView = createView(container, html);

    return combineStore({
      activity: connectActivities(activitySelect),
      selections: connectSelections(selections, html),
    });
  });
};
