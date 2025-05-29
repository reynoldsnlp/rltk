import view from '../view';
import { combineStore } from './Store';

export default (commands, markupStatus) => {
  combineStore({ commands, markupStatus })
    .filter(
      ({ commands: { command }, markupStatus }) =>
        command === 'start' && markupStatus === 'markup done')
    .distinctUntilChanged(
      (a, b) => a.commands.configuration.topic === b.commands.configuration.topic
        && a.commands.configuration.language === b.commands.configuration.language)
    .subscribe(
      ({ commands: { configuration: { topic, language } } }) =>
        view.notification.add(`Topic ${language}/${topic} is ready`));
};
