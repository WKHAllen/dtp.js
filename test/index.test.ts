import {Client, Server} from "../src";
import {wait} from "../src/wait";
import {
    decodeMessageSize,
    DEFAULT_CLIENT_HOST,
    DEFAULT_PORT,
    DEFAULT_SERVER_HOST,
    encodeMessageSize,
} from "../src/util";
import {ExpectMap} from "./expect-map";
import * as crypto from "crypto";

/**
 * The amount of time in milliseconds to wait between each network operation.
 */
const waitTime = 100;

/**
 * A custom type to be sent over a network interface.
 */
class Custom {
    public a: number = 0;
    public b: string = "";
    public c: string[] = [];
}

/**
 * Test message size encoding.
 */
test("test util", () => {
    expect(encodeMessageSize(0)).toEqual(new Uint8Array([0, 0, 0, 0, 0]));
    expect(encodeMessageSize(1)).toEqual(new Uint8Array([0, 0, 0, 0, 1]));
    expect(encodeMessageSize(255)).toEqual(new Uint8Array([0, 0, 0, 0, 255]));
    expect(encodeMessageSize(256)).toEqual(new Uint8Array([0, 0, 0, 1, 0]));
    expect(encodeMessageSize(257)).toEqual(new Uint8Array([0, 0, 0, 1, 1]));
    expect(encodeMessageSize(4311810305)).toEqual(
        new Uint8Array([1, 1, 1, 1, 1])
    );
    expect(encodeMessageSize(4328719365)).toEqual(
        new Uint8Array([1, 2, 3, 4, 5])
    );
    expect(encodeMessageSize(47362409218)).toEqual(
        new Uint8Array([11, 7, 5, 3, 2])
    );
    expect(encodeMessageSize(1099511627775)).toEqual(
        new Uint8Array([255, 255, 255, 255, 255])
    );

    expect(decodeMessageSize(new Uint8Array([0, 0, 0, 0, 0]))).toEqual(0);
    expect(decodeMessageSize(new Uint8Array([0, 0, 0, 0, 1]))).toEqual(1);
    expect(decodeMessageSize(new Uint8Array([0, 0, 0, 0, 255]))).toEqual(255);
    expect(decodeMessageSize(new Uint8Array([0, 0, 0, 1, 0]))).toEqual(256);
    expect(decodeMessageSize(new Uint8Array([0, 0, 0, 1, 1]))).toEqual(257);
    expect(decodeMessageSize(new Uint8Array([1, 1, 1, 1, 1]))).toEqual(
        4311810305
    );
    expect(decodeMessageSize(new Uint8Array([1, 2, 3, 4, 5]))).toEqual(
        4328719365
    );
    expect(decodeMessageSize(new Uint8Array([11, 7, 5, 3, 2]))).toEqual(
        47362409218
    );
    expect(decodeMessageSize(new Uint8Array([255, 255, 255, 255, 255]))).toEqual(
        1099511627775
    );
});

/**
 * Test server creation and serving.
 */
test("test server serve", async () => {
    const server = new Server();
    expect(server.isServing()).toBe(false);
    await server.start();
    expect(server.isServing()).toBe(true);
    await wait(waitTime);

    expect(server.isServing()).toBe(true);
    await server.stop();
    expect(server.isServing()).toBe(false);
    await wait(waitTime);
});

/**
 * Test sending and receiving messages between client and server.
 */
test("test send and receive", async () => {
    const expected = new ExpectMap({
        "server receive": 1,
        "server connect": 1,
        "server disconnect": 1,
        "client receive": 1,
        "client disconnected": 0,
    });
    expect(expected.getExpected()).toEqual({
        "server receive": 1,
        "server connect": 1,
        "server disconnect": 1,
        "client receive": 1,
        "client disconnected": 0,
    });

    const server = new Server();
    server.on("receive", (clientID, data) => {
        expect(clientID).toBe(0);
        expect(data).toBe("Hello, server!");
        expected.received("server receive");
    });
    server.on("connect", (clientID) => {
        expect(clientID).toBe(0);
        expected.received("server connect");
    });
    server.on("disconnect", (clientID) => {
        expect(clientID).toBe(0);
        expected.received("server disconnect");
    });

    expect(server.isServing()).toBe(false);
    await server.start();
    expect(server.isServing()).toBe(true);
    await wait(waitTime);

    const client = new Client();
    client.on("receive", (data) => {
        expect(data).toBe("Hello, client!");
        expected.received("client receive");
    });
    client.on("disconnected", () => {
        // Should not happen
        expected.received("client disconnected");
    });

    expect(client.isConnected()).toBe(false);
    await client.connect();
    expect(client.isConnected()).toBe(true);
    await wait(waitTime);

    await client.send("Hello, server!");
    await server.send("Hello, client!");

    await wait(waitTime);
    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);

    await wait(waitTime);
    expect(server.isServing()).toBe(true);
    await server.stop();
    expect(server.isServing()).toBe(false);
    await wait(waitTime);

    expect(expected.remaining()).toStrictEqual({});
    expect(expected.done()).toBeTruthy();
});

/**
 * Test sending more complex objects between client and server.
 */
test("test sending objects", async () => {
    const expected = new ExpectMap({
        "server receive": 1,
        "server connect": 1,
        "server disconnect": 1,
        "client receive": 1,
        "client disconnected": 0,
    });

    const server = new Server();
    server.on("receive", (clientID, data) => {
        expect(clientID).toBe(0);
        expect(data).toStrictEqual({hello: "server"});
        expected.received("server receive");
    });
    server.on("connect", (clientID) => {
        expect(clientID).toBe(0);
        expected.received("server connect");
    });
    server.on("disconnect", (clientID) => {
        expect(clientID).toBe(0);
        expected.received("server disconnect");
    });

    await server.start();
    await wait(waitTime);

    const client = new Client();
    client.on("receive", (data) => {
        expect(data).toStrictEqual({hello: "client"});
        expected.received("client receive");
    });
    client.on("disconnected", () => {
        // Should not happen
        expected.received("client disconnected");
    });

    await client.connect();
    await wait(waitTime);

    await client.send({hello: "server"});
    await server.send({hello: "client"});

    await wait(waitTime);
    await client.disconnect();
    await wait(waitTime);
    await server.stop();
    await wait(waitTime);

    expect(expected.remaining()).toStrictEqual({});
    expect(expected.done()).toBeTruthy();
});

/**
 * Test sending larger messages over the network.
 */
test("test sending large messages", async () => {
    const expected = new ExpectMap({
        "server receive": 1,
        "server connect": 1,
        "server disconnect": 1,
        "client receive": 1,
        "client disconnected": 0,
    });

    const largeMessageFromServer = crypto.randomInt(2147483648, 4294967295);
    const largeMessageFromClient = crypto.randomInt(4294967296, 8589934591);

    const server = new Server();
    server.on("receive", (clientID, data) => {
        expect(clientID).toBe(0);
        expect(data).toStrictEqual(largeMessageFromClient);
        expected.received("server receive");
    });
    server.on("connect", (_clientID) => {
        expected.received("server connect");
    });
    server.on("disconnect", (_clientID) => {
        // Should not happen
        expected.received("server disconnect");
    });

    await server.start();
    await wait(waitTime);

    const client = new Client();
    client.on("receive", (data) => {
        expect(data).toStrictEqual(largeMessageFromServer);
        expected.received("client receive");
    });
    client.on("disconnected", () => {
        // Should not happen
        expected.received("client disconnected");
    });

    await client.connect();
    await wait(waitTime);

    await client.send(largeMessageFromClient);
    await server.send(largeMessageFromServer);

    await wait(waitTime);
    await client.disconnect();
    await wait(waitTime);
    await server.stop();
    await wait(waitTime);

    expect(expected.remaining()).toStrictEqual({});
    expect(expected.done()).toBeTruthy();
});

/**
 * Test sending multiple messages over the network.
 */
test("test sending numerous messages", async () => {
    const numServerMessages = crypto.randomInt(64, 127);
    const numClientMessages = crypto.randomInt(128, 255);
    const messagesFromServer: number[] = [];
    const messagesFromClient: number[] = [];
    let serverMessageIndex = 0;
    let clientMessageIndex = 0;

    for (let i = 0; i < numServerMessages; i++) {
        messagesFromServer.push(crypto.randomInt(1024));
    }

    for (let i = 0; i < numClientMessages; i++) {
        messagesFromClient.push(crypto.randomInt(1024));
    }

    const expected = new ExpectMap({
        "server receive": numClientMessages,
        "server connect": 1,
        "server disconnect": 1,
        "client receive": numServerMessages,
        "client disconnected": 0,
    });

    const server = new Server();
    server.on("receive", (clientID, data) => {
        expect(clientID).toBe(0);
        expect(data).toBe(messagesFromClient[clientMessageIndex]);
        clientMessageIndex++;
        expected.received("server receive");
    });
    server.on("connect", (_clientID) => {
        expected.received("server connect");
    });
    server.on("disconnect", (_clientID) => {
        // Should not happen
        expected.received("server disconnect");
    });

    await server.start();
    await wait(waitTime);

    const client = new Client();
    client.on("receive", (data) => {
        expect(data).toBe(messagesFromServer[serverMessageIndex]);
        serverMessageIndex++;
        expected.received("client receive");
    });
    client.on("disconnected", () => {
        // Should not happen
        expected.received("client disconnected");
    });

    await client.connect();
    await wait(waitTime);

    for (const messageFromClient of messagesFromClient) {
        await client.send(messageFromClient);
    }

    for (const messageFromServer of messagesFromServer) {
        await server.send(messageFromServer);
    }

    await wait(waitTime);
    await client.disconnect();
    await wait(waitTime);
    await server.stop();
    await wait(waitTime);

    expect(serverMessageIndex).toBe(numServerMessages);
    expect(clientMessageIndex).toBe(numClientMessages);

    expect(expected.remaining()).toStrictEqual({});
    expect(expected.done()).toBeTruthy();
});

/**
 * Test sending and receiving custom types.
 */
test("test send/receive custom types", async () => {
    const expected = new ExpectMap({
        "server receive": 1,
        "server connect": 1,
        "server disconnect": 1,
        "client receive": 1,
        "client disconnected": 0,
    });
    expect(expected.getExpected()).toEqual({
        "server receive": 1,
        "server connect": 1,
        "server disconnect": 1,
        "client receive": 1,
        "client disconnected": 0,
    });

    const serverMessage = new Custom();
    serverMessage.a = 123;
    serverMessage.b = "Hello, custom server class!";
    serverMessage.c.push("first server item");
    serverMessage.c.push("second server item");
    const clientMessage = new Custom();
    clientMessage.a = 456;
    clientMessage.b = "Hello, custom client class!";
    clientMessage.c.push("#1 client item");
    clientMessage.c.push("client item #2");
    clientMessage.c.push("(3) client item");

    const server = new Server<Custom, Custom>();
    server.on("receive", (clientID, data) => {
        expect(clientID).toBe(0);
        expect(data).toEqual(serverMessage);
        expected.received("server receive");
    });
    server.on("connect", (clientID) => {
        expect(clientID).toBe(0);
        expected.received("server connect");
    });
    server.on("disconnect", (clientID) => {
        expect(clientID).toBe(0);
        expected.received("server disconnect");
    });

    expect(server.isServing()).toBe(false);
    await server.start();
    expect(server.isServing()).toBe(true);
    await wait(waitTime);

    const client = new Client<Custom, Custom>();
    client.on("receive", (data) => {
        expect(data).toEqual(clientMessage);
        expected.received("client receive");
    });
    client.on("disconnected", () => {
        // Should not happen
        expected.received("client disconnected");
    });

    expect(client.isConnected()).toBe(false);
    await client.connect();
    expect(client.isConnected()).toBe(true);
    await wait(waitTime);

    await client.send(serverMessage);
    await server.send(clientMessage);

    await wait(waitTime);
    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);

    await wait(waitTime);
    expect(server.isServing()).toBe(true);
    await server.stop();
    expect(server.isServing()).toBe(false);
    await wait(waitTime);

    expect(expected.remaining()).toStrictEqual({});
    expect(expected.done()).toBeTruthy();
});

/**
 * Test having multiple clients connected.
 */
test("test multiple clients", async () => {
    const expected = new ExpectMap({
        "server receive": 2,
        "server connect": 2,
        "server disconnect": 2,
        "client receive": 4,
        "client disconnected": 0,
    });
    expect(expected.getExpected()).toEqual({
        "server receive": 2,
        "server connect": 2,
        "server disconnect": 2,
        "client receive": 4,
        "client disconnected": 0,
    });
    const messagesFromClients = [
        "Hello from client #1!",
        "Goodbye from client #2!"
    ];
    const messageFromServer = 29275;
    const messageToClient1 = 123;
    const messageToClient2 = 456;
    let receivingIndividualMessage = false;

    const server = new Server();
    server.on("receive", (clientID, data) => {
        expect(data).toBe(messagesFromClients[clientID]);
        expected.received("server receive");
    });
    server.on("connect", (_clientID) => {
        expected.received("server connect");
    });
    server.on("disconnect", (_clientID) => {
        expected.received("server disconnect");
    });

    expect(server.isServing()).toBe(false);
    await server.start();
    expect(server.isServing()).toBe(true);
    await wait(waitTime);

    const client1 = new Client();
    client1.on("receive", (data) => {
        if (!receivingIndividualMessage) {
            expect(data).toBe(messageFromServer);
        } else {
            expect(data).toBe(messageToClient1);
        }

        expected.received("client receive");
    });
    client1.on("disconnected", () => {
        // Should not happen
        expected.received("client disconnected");
    });

    expect(client1.isConnected()).toBe(false);
    await client1.connect();
    expect(client1.isConnected()).toBe(true);
    await wait(waitTime);

    const client2 = new Client();
    client2.on("receive", (data) => {
        if (!receivingIndividualMessage) {
            expect(data).toBe(messageFromServer);
        } else {
            expect(data).toBe(messageToClient2);
        }

        expected.received("client receive");
    });
    client2.on("disconnected", () => {
        // Should not happen
        expected.received("client disconnected");
    });

    expect(client2.isConnected()).toBe(false);
    await client2.connect();
    expect(client2.isConnected()).toBe(true);
    await wait(waitTime);

    await client1.send(messagesFromClients[0]);
    await wait(waitTime);
    await client2.send(messagesFromClients[1]);
    await wait(waitTime);
    await server.send(messageFromServer);
    await wait(waitTime);
    receivingIndividualMessage = true;
    server.send(messageToClient1, 0);
    await wait(waitTime);
    server.send(messageToClient2, 1);
    await wait(waitTime);

    expect(client1.isConnected()).toBe(true);
    await client1.disconnect();
    expect(client1.isConnected()).toBe(false);
    await wait(waitTime);

    expect(client2.isConnected()).toBe(true);
    await client2.disconnect();
    expect(client2.isConnected()).toBe(false);
    await wait(waitTime);

    expect(server.isServing()).toBe(true);
    await server.stop();
    expect(server.isServing()).toBe(false);
    await wait(waitTime);

    expect(expected.remaining()).toStrictEqual({});
    expect(expected.done()).toBeTruthy();
});

/**
 * Test send/receive type generics for client and server.
 */
test("test send and receive generics", async () => {
    let received = false;
    const message = "What is the length of this string?";

    const server = new Server<number, string>();
    server.on("receive", (clientID, data) => {
        server.send(data.length, clientID);
    });
    server.on("connect", (clientID) => {
        expect(clientID).toBe(0);
    });
    server.on("disconnect", (clientID) => {
        expect(clientID).toBe(0);
    });

    expect(server.isServing()).toBe(false);
    await server.start();
    expect(server.isServing()).toBe(true);
    await wait(waitTime);

    const client = new Client<string, number>();
    client.on("receive", (data) => {
        expect(data).toBe(message.length);
        received = true;
    });

    expect(client.isConnected()).toBe(false);
    await client.connect();
    expect(client.isConnected()).toBe(true);
    await wait(waitTime);

    await client.send(message);

    await wait(waitTime);
    expect(client.isConnected()).toBe(true);
    await client.disconnect();
    expect(client.isConnected()).toBe(false);

    await wait(waitTime);
    expect(server.isServing()).toBe(true);
    await server.stop();
    expect(server.isServing()).toBe(false);
    await wait(waitTime);

    expect(received).toBe(true);
});

/**
 * Test client disconnect events.
 */
test("test client disconnected", async () => {
    const expected = new ExpectMap({
        "server receive": 0,
        "server connect": 1,
        "server disconnect": 0,
        "client receive": 0,
        "client disconnected": 1,
    });

    const server = new Server();
    server.on("receive", (_clientID, _data) => {
        // Should not happen
        expected.received("server receive");
    });
    server.on("connect", (_clientID) => {
        expected.received("server connect");
    });
    server.on("disconnect", (_clientID) => {
        // Should not happen
        expected.received("server disconnect");
    });

    expect(server.isServing()).toBe(false);
    await server.start();
    expect(server.isServing()).toBe(true);
    await wait(waitTime);

    const client = new Client();
    client.on("receive", (_data) => {
        // Should not happen
        expected.received("client receive");
    });
    client.on("disconnected", () => {
        expected.received("client disconnected");
    });

    expect(client.isConnected()).toBe(false);
    await client.connect();
    expect(client.isConnected()).toBe(true);

    await wait(waitTime);
    expect(server.isServing()).toBe(true);
    expect(client.isConnected()).toBe(true);
    await server.stop();
    expect(server.isServing()).toBe(false);
    await wait(waitTime);
    expect(client.isConnected()).toBe(false);

    expect(expected.remaining()).toStrictEqual({});
    expect(expected.done()).toBeTruthy();
});

/**
 * Test removing clients from a server.
 */
test("test remove client", async () => {
    const expected = new ExpectMap({
        "server receive": 0,
        "server connect": 1,
        "server disconnect": 0,
        "client receive": 0,
        "client disconnected": 1,
    });

    const server = new Server();
    server.on("receive", (_clientID, _data) => {
        // Should not happen
        expected.received("server receive");
    });
    server.on("connect", (_clientID) => {
        expected.received("server connect");
    });
    server.on("disconnect", (_clientID) => {
        // Should not happen
        expected.received("server disconnect");
    });

    await server.start();
    await wait(waitTime);

    const client = new Client();
    client.on("receive", (_data) => {
        // Should not happen
        expected.received("client receive");
    });
    client.on("disconnected", () => {
        expected.received("client disconnected");
    });

    await client.connect();
    await wait(waitTime);

    server.removeClient(0);

    await wait(waitTime);
    await server.stop();
    await wait(waitTime);

    expect(expected.remaining()).toStrictEqual({});
    expect(expected.done()).toBeTruthy();
});

/**
 * Test socket addresses match.
 */
test("test server and client address methods", async () => {
    const server = new Server();
    await server.start({host: "127.0.0.1", port: 0});

    const serverAddr = server.getAddr();
    expect(serverAddr).not.toBeNull();
    expect(serverAddr).not.toBeUndefined();
    const host = serverAddr?.host as string;
    const port = serverAddr?.port as number;
    expect(host).toBeTruthy();
    expect(host).not.toEqual("");
    expect(port).toBeTruthy();
    expect(port).not.toEqual(0);

    const client = new Client();
    await client.connect({host, port});
    await wait(waitTime);

    expect(client.getServerAddr()).toStrictEqual({
        host,
        port,
    });
    expect(client.getAddr()).toStrictEqual(server.getClientAddr(0));

    await client.disconnect();
    await server.stop();
});

/**
 * Test default socket host match.
 */
test("test server and client default host", async () => {
    const server = new Server();
    await server.start({port: 29275});
    await wait(waitTime);

    const client = new Client();
    await client.connect({port: 29275});
    await wait(waitTime);

    expect(server.getAddr().host).toBe(DEFAULT_SERVER_HOST);
    expect(client.getServerAddr().host).toBe(DEFAULT_CLIENT_HOST);
    expect(client.getAddr()).toStrictEqual(server.getClientAddr(0));

    await client.disconnect();
    await server.stop();
});

/**
 * Test default socket port match.
 */
test("test server and client default port", async () => {
    const server = new Server();
    await server.start({host: "127.0.0.1"});
    await wait(waitTime);

    const client = new Client();
    await client.connect({host: "127.0.0.1"});
    await wait(waitTime);

    expect(server.getAddr().port).toBe(DEFAULT_PORT);
    expect(client.getServerAddr().port).toBe(DEFAULT_PORT);
    expect(client.getAddr()).toStrictEqual(server.getClientAddr(0));

    await client.disconnect();
    await server.stop();
});

/**
 * Test default socket host and port match.
 */
test("test server and client default host and port", async () => {
    const server = new Server();
    await server.start();
    await wait(waitTime);

    const client = new Client();
    await client.connect();
    await wait(waitTime);

    expect(server.getAddr()).toStrictEqual({
        host: DEFAULT_SERVER_HOST,
        port: DEFAULT_PORT,
    });
    expect(client.getServerAddr()).toStrictEqual({
        host: DEFAULT_CLIENT_HOST,
        port: DEFAULT_PORT,
    });
    expect(client.getAddr()).toStrictEqual(server.getClientAddr(0));

    await client.disconnect();
    await server.stop();
});
