/**
 * A mapping of event names to number of times the events occur.
 */
interface ExpectMapInner {
  [key: string]: number;
}

/**
 * Expect specific events to occur a given number of times.
 */
export class ExpectMap {
  /**
   * The event name to number of occurences mapping.
   */
  private expected: ExpectMapInner;

  constructor(expected: ExpectMapInner) {
    this.expected = expected;
  }

  /**
   * Mark an event has having occurred.
   *
   * @param name The name of the event.
   */
  public received(name: string) {
    if (name in this.expected) {
      this.expected[name]--;
    } else {
      throw new Error(`Received value with unexpected name: ${name}`);
    }
  }

  /**
   * Get the currently remaining event mapping.
   *
   * @returns The currently remaining event mapping.
   */
  public getExpected(): ExpectMapInner {
    return this.expected;
  }

  /**
   * Get the remaining event mapping, with completed events removed.
   *
   * @returns The remaining event mapping, with completed events removed.
   */
  public remaining(): ExpectMapInner {
    const remaining: ExpectMapInner = {};

    for (const name in this.expected) {
      if (this.expected[name] !== 0) {
        remaining[name] = this.expected[name];
      }
    }

    return remaining;
  }

  /**
   * Check if the events have all completed.
   *
   * @returns Whether all events have completed.
   */
  public done(): boolean {
    return Object.keys(this.remaining()).length === 0;
  }
}
