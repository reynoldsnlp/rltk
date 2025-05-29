import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/merge';

export function mergeStore(initialStore, observables) {
  return Observable.merge(...observables).scan((state, k) => k(state), initialStore);
};

export function combineStore(observableMap) {
  const entries = Object.entries(observableMap);
  const keys = entries.map(([key, value]) => key);
  const observables = entries.map(([key, value]) => value);
  return Observable.combineLatest(observables)
    .map(newValues => {
      const r = {};
      keys.forEach((key, index) => {
        r[key] = newValues[index];
      });
      return r;
    });
};
