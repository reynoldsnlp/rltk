import { combineStore, mergeStore } from '../../../../../viewWE/content_scripts/js/V2/Store';
import { TestScheduler } from "rxjs/testing/TestScheduler";

describe('Store', function() {
  describe('combineStore', function() {
    it('emits combined values for a complex object', function() {
      const mappings = {
        x: { stream1: 'a', stream2: 'c' },
        y: { stream1: 'b', stream2: 'c' },
        z: { stream1: 'b', stream2: 'd' },
      };

      const testScheduler = new TestScheduler((a, b) => expect(a).to.deep.equal(b));

      const stream1  = testScheduler.createColdObservable('-a---b--');
      const stream2  = testScheduler.createColdObservable('---c---d');
      const expected =                                    '---x-y-z';

      testScheduler.expectObservable(combineStore({ stream1, stream2 })).toBe(expected, mappings);
      testScheduler.flush();
    });
  });
});
