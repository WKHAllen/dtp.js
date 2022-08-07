interface ExpectMapInner {
  [key: string]: number;
}

export class ExpectMap {
  private expected: ExpectMapInner;

  constructor(expected: ExpectMapInner) {
    this.expected = expected;
  }

  public received(name: string) {
    if (name in this.expected) {
      this.expected[name]--;
    } else {
      throw new Error(`Received value with unexpected name: ${name}`);
    }
  }

  public getExpected(): ExpectMapInner {
    return this.expected;
  }

  public remaining(): ExpectMapInner {
    const remaining: ExpectMapInner = {};

    for (const name in this.expected) {
      if (this.expected[name] !== 0) {
        remaining[name] = this.expected[name];
      }
    }

    return remaining;
  }

  public done(): boolean {
    return Object.keys(this.remaining()).length === 0;
  }
}
