import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import Color from './Enhancements/Color';
import Cloze from './Enhancements/Cloze';
import MultipleChoice from './Enhancements/MultipleChoice';
import Click from './Enhancements/Click';
import { combineStore } from '../Store';
import selectionsToConstraints from './SelectionsToConstraints';
import specialTargets from './Targets';

const matchesSelections = (node, selections) => {
  const entries = Object.entries(selections);
  for (const [attribute, { match }] of entries) {
    const value = node.getAttribute(attribute);
    if (!match.has(value)) {
      return false;
    }
  }
  return true;
};

const selectifyTargets = (targets) => {
  const selections = {};
  targets.forEach(({ data, match }) => selections[`data-${data}`] = { match: new Set(match) }) ;
  return selections;
};

const genericTargets = (selections, targets) => {
  const attributes = Object.keys(selections);
  const cssQuery = 'viewEnhancement' + attributes.map(attr => `[${attr}]`).join('');
  const nodeList = document.querySelectorAll(cssQuery);
  const nodes = [];
  const constraints = Object.assign({}, selectifyTargets(targets), selections);
  for (var node of nodeList) {
    if (matchesSelections(node, constraints)) {
      nodes.push(node);
    }
  }
  return nodes;
};

const getHits = (selections, targets, language) => {
  if (typeof targets === 'string') {
    return specialTargets(selections, targets, language);
  }

  return genericTargets(selections, targets);
};

class Enhancer {
  constructor() {
    this.enhancement = null;
    this.nodes = [];
    this.enhanced = false;

    this.enhancements = {
      'color': Color,
      'click': Click,
      'mc': MultipleChoice,
      'cloze': Cloze,
    };
  }

  start(activity, selections, targets, topic, language) {
    const anchors = document.querySelectorAll('a');
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      anchor.removeAttribute('href');
      anchor.setAttribute('data-view-href', href);
    }
    this.enhancement = new this.enhancements[activity](topic, language);
    this.nodes = getHits(selections, targets, language);
    for (const node of this.nodes) {
      this.enhancement.enhance(node, activity);
    }
  }

  stop() {
    const anchors = document.querySelectorAll('a');
    for (const anchor of anchors) {
      const href = anchor.getAttribute('data-href');
      anchor.setAttribute('href', href);
      anchor.removeAttribute('data-view-href');
    }

    for (const node of this.nodes) {
      this.enhancement.clear(node);
    }

    typeof this.enhancement.destroy === 'function'
      && this.enhancement.destroy();

    this.nodes = [];
    this.enhancement = null;
  }

  update(activity, selections, targets, topic, language) {
    this.enhanced && this.stop();
    this.start(activity, selections, targets, topic, language);
    this.enhanced = true;
  }
}

export default (selections$, markup$, command$) => {
  const status = new Subject();
  const enhancer = new Enhancer();
  combineStore({ selectionConfig: selections$, markup: markup$, control: command$ })
    .filter(({ markup }) => markup === 'markup done')
    .filter(({ control: { command } }) => command === 'start')
    .map(({ selectionConfig: { ...selectionConfig, selections }, ...config }) => ({
      ...config, selectionConfig, constraints: selectionsToConstraints(selections)
    }))
    .subscribe(({
      selectionConfig: { activity },
      constraints,
      control: { configuration: { targets, topic, language }}
    }) => {
      status.next('updating enhancements');
      enhancer.update(activity, constraints, targets, topic, language);
      status.next('ready');
    }
  );
  return status;
};
