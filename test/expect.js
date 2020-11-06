class Expect {
	constructor(expected) {
		this.expected = expected;
	}

	received(name) {
		if (name in this.expected) {
			this.expected[name]--;
		} else {
			throw new Error(`Received value with unexpected name: ${name}`);
		}
	}

	getExpected() {
		return this.expected;
	}

	remaining() {
		let remaining = {};
		for (const name in this.expected) {
			if (this.expected[name] !== 0) {
				remaining[name] = this.expected[name];
			}
		}
		return remaining;
	}

	done() {
		return this.remaining().length === 0;
	}
}

module.exports = {
	Expect
}
