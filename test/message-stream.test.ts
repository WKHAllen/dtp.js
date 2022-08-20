import {MessageStream} from "../src/message-stream";

/**
 * Test message streams.
 */
test("test message stream", () => {
    const messageStream = new MessageStream();

    expect(messageStream.received(Buffer.from([0, 0, 0, 0, 1, 67]))).toEqual([
        Buffer.from("C"),
    ]);

    expect(
        messageStream.received(
            Buffer.from([0, 0, 0, 0, 1, 65, 0, 0, 0, 0, 3, 65, 66, 67])
        )
    ).toEqual([Buffer.from("A"), Buffer.from("ABC")]);

    expect(messageStream.received()).toEqual([]);

    expect(messageStream.received(Buffer.from([0, 0, 0, 0, 2, 68]))).toEqual([]);
    expect(messageStream.received(Buffer.from([69]))).toEqual([
        Buffer.from("DE"),
    ]);

    expect(messageStream.received(Buffer.from([0, 0, 0, 0, 2, 68]))).toEqual([]);
    expect(messageStream.received(Buffer.from([69, 0, 0, 0, 0, 1, 70]))).toEqual([
        Buffer.from("DE"),
        Buffer.from("F"),
    ]);
});
