const util = require('../dist/util');

test('adds 1 + 2 to equal 3', () => {
	expect(util.sum(1, 2)).toBe(3);
});
