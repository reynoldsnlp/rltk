import { Observable } from 'rxjs';
import 'rxjs/add/observable/fromEvent';
const idPrefix = 'wertiview-toolbar';

/**
 * This function assembles the main control stream for V2 topic configurations.
 * The language & topic selects are watched for change events, and their values
 * will then be checked for the availability of a corresponding V2 topic.
 *
 * The resulting stream allows subscribes to instantiate V2 topics and their
 * event streams. The stream contains object which are guaranteed to have the
 * 'command' field. On the value command='start', a 'configuration' object will
 * be passed, which contains the topic, language, and selections for the chosen
 * topic.
 *
 * The command='stop' means that V2-activity should cease, either because the
 * toolbar was closed, or because a non-V2-topic was selected. 'stop' is not
 * issued when switching from one V2-topic to another.
 */
export default (viewTopics) => {
  const languageSelect = document.getElementById(`${idPrefix}-language-menu`);
  function getLanguage() {
    return languageSelect.value;
  }

  function getTopic() {
    return document.querySelector('.selected-toolbar-topic-menu').value;
  }

  function getV2TopicConfiguration(topic, language) {
    if (topic && viewTopics[topic] && viewTopics[topic].version === 2) {
      return { language, topic, ...viewTopics[topic].languages[language] };
    };

    return null;
  }

  // FIXME this is pure madness, but currently the HTML for the topic selects is
  // hardcoded, not procedural
  const topicSelectDe = document.getElementById(`${idPrefix}-topic-menu-de`);
  const topicSelectEn = document.getElementById(`${idPrefix}-topic-menu-en`);
  const topicSelectRu = document.getElementById(`${idPrefix}-topic-menu-ru`);
  const updates = Observable.merge(
    Observable.fromEvent(languageSelect, 'change'),
    Observable.fromEvent(topicSelectDe, 'change'),
    Observable.fromEvent(topicSelectEn, 'change'),
    Observable.fromEvent(topicSelectRu, 'change'),
  );

  // map event streams to commands with payload
  const selectEvents = updates.map(() => {
    const language = getLanguage();
    const topic = getTopic();

    return { topic, language };
  }).map(({ topic, language }) => ({
    configuration: getV2TopicConfiguration(topic, language)
  })).map(({ configuration, topic, language }) => {
    if (configuration === null) {
      return { command: 'stop' };
    }

    return { command: 'start', configuration };
  });

  const closeButton = document.getElementById(`${idPrefix}-toggle-button`);
  const closeEvent = Observable.fromEvent(closeButton, 'click').map(() => ({ command: 'stop' }));

  return Observable.merge(closeEvent, selectEvents)
  // suppress bogus 'stop' before the configuration is valid
    .skipWhile(({ command }) => command === 'stop')
  // suppress multiple 'stops'
    .distinctUntilChanged((a, b) => {
      return a.command === b.command && a.command === 'stop';
    });
}
