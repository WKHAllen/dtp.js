import {WaitGroup} from "../src/wait";

/**
 * Test wait groups.
 */
test("test wait group", async () => {
    const wg = new WaitGroup();

    wg.add(3);
    expect(wg.getTotal()).toBe(3);
    wg.done();
    expect(wg.getTotal()).toBe(2);
    wg.done();
    expect(wg.getTotal()).toBe(1);
    wg.done();
    expect(wg.getTotal()).toBe(0);

    wg.add();
    expect(wg.getTotal()).toBe(1);
    setTimeout(() => wg.done(), 100);
    await wg.wait();
    expect(wg.getTotal()).toBe(0);
});
