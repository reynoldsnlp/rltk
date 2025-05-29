import TopicView from './TopicView';

/**
 * Hides legacy topics, and prepares toolbar for V2 topic operation.
 * Returns the update function which can be used to show status updates
 */
export default (configuration, container) => {
  let topicView = new TopicView(container);
  configuration.subscribe(({ command }) => {
    if (command === 'start') {
      topicView.show();
    }

    if (command === 'stop') {
      topicView.hide();
    }
  });

  return status => topicView.update(status);
};
