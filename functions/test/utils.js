const assert = require('assert');
const { secondsToTimePhrase } = require('../utils');

describe('Utils', () => {
  describe('secondsToTimePhrase', () => {

    it('should correctly handle plurals for seconds', () => {
      assert.equal(secondsToTimePhrase(0), '0 seconds');
      assert.equal(secondsToTimePhrase(1), '1 second');
      assert.equal(secondsToTimePhrase(2), '2 seconds');
    });

    it('should return minutes and seconds correctly', () => {
      assert.equal(secondsToTimePhrase(63), '1 minute and 3 seconds');
      assert.equal(secondsToTimePhrase(143), '2 minutes and 23 seconds');
    });

    it('should return hours and seconds correctly', () => {
      assert.equal(secondsToTimePhrase(3643), '1 hour and 43 seconds');
    });

    it('should return hours, minutes and seconds correctly', () => {
      assert.equal(secondsToTimePhrase(7300), '2 hours and 1 minute and 40 seconds');
    });
  });
});