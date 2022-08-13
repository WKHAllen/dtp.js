import { Client, Server } from "../src";
import { wait } from "../src/wait";
import {
  DEFAULT_CLIENT_HOST,
  DEFAULT_SERVER_HOST,
  DEFAULT_PORT,
  encodeMessageSize,
  decodeMessageSize,
} from "../src/util";
import { ExpectMap } from "./expect-map";
import * as crypto from "crypto";

/**
 * The amount of time in milliseconds to wait between each network operation.
 */
const waitTime = 100;

/**
 * Test message size encoding.
 */
test("test encode message size", () => {
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
});

/**
 * Test message size decoding.
 */
test("test decode message size", () => {
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
 * Test sending and receiving messages between client and server.
 */
test("test send and receive", async () => {
  const expected = new ExpectMap({
    "server recv": 1,
    "server connect": 1,
    "server disconnect": 1,
    "client recv": 1,
    "client disconnected": 0,
  });

  const server = new Server();
  server.on("recv", (clientID, data) => {
    expect(clientID).toBe(0);
    expect(data).toBe("Hello, server!");
    expected.received("server recv");
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
  client.on("recv", (data) => {
    expect(data).toBe("Hello, client!");
    expected.received("client recv");
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
    "server recv": 1,
    "server connect": 1,
    "server disconnect": 1,
    "client recv": 1,
    "client disconnected": 0,
  });

  const server = new Server();
  server.on("recv", (clientID, data) => {
    expect(clientID).toBe(0);
    expect(data).toStrictEqual({ hello: "server" });
    expected.received("server recv");
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
  client.on("recv", (data) => {
    expect(data).toStrictEqual({ hello: "client" });
    expected.received("client recv");
  });
  client.on("disconnected", () => {
    // Should not happen
    expected.received("client disconnected");
  });

  await client.connect();
  await wait(waitTime);

  await client.send({ hello: "server" });
  await server.send({ hello: "client" });

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
    "server recv": 1,
    "server connect": 1,
    "server disconnect": 1,
    "client recv": 1,
    "client disconnected": 0,
  });

  const largeMessageFromServer = crypto.randomInt(2147483648, 4294967295);
  const largeMessageFromClient = crypto.randomInt(4294967296, 8589934591);

  const server = new Server();
  server.on("recv", (clientID, data) => {
    expect(clientID).toBe(0);
    expect(data).toStrictEqual(largeMessageFromClient);
    expected.received("server recv");
  });
  server.on("connect", (clientID) => {
    expected.received("server connect");
  });
  server.on("disconnect", (clientID) => {
    // Should not happen
    expected.received("server disconnect");
  });

  await server.start();
  await wait(waitTime);

  const client = new Client();
  client.on("recv", (data) => {
    expect(data).toStrictEqual(largeMessageFromServer);
    expected.received("client recv");
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
    "server recv": numClientMessages,
    "server connect": 1,
    "server disconnect": 1,
    "client recv": numServerMessages,
    "client disconnected": 0,
  });

  const server = new Server();
  server.on("recv", (clientID, data) => {
    expect(clientID).toBe(0);
    expect(data).toBe(messagesFromClient[clientMessageIndex]);
    clientMessageIndex++;
    expected.received("server recv");
  });
  server.on("connect", (clientID) => {
    expected.received("server connect");
  });
  server.on("disconnect", (clientID) => {
    // Should not happen
    expected.received("server disconnect");
  });

  await server.start();
  await wait(waitTime);

  const client = new Client();
  client.on("recv", (data) => {
    expect(data).toBe(messagesFromServer[serverMessageIndex]);
    serverMessageIndex++;
    expected.received("client recv");
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
 * Test send/receive type generics for client and server.
 */
test("test send and receive generics", async () => {
  let received = false;
  const message = "What is the length of this string?";

  const server = new Server<number, string>();
  server.on("recv", (clientID, data) => {
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
  client.on("recv", (data) => {
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
    "server recv": 0,
    "server connect": 1,
    "server disconnect": 0,
    "client recv": 0,
    "client disconnected": 1,
  });

  const server = new Server();
  server.on("recv", (clientID, data) => {
    // Should not happen
    expected.received("server recv");
  });
  server.on("connect", (clientID) => {
    expected.received("server connect");
  });
  server.on("disconnect", (clientID) => {
    // Should not happen
    expected.received("server disconnect");
  });

  expect(server.isServing()).toBe(false);
  await server.start();
  expect(server.isServing()).toBe(true);
  await wait(waitTime);

  const client = new Client();
  client.on("recv", (data) => {
    // Should not happen
    expected.received("client recv");
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
    "server recv": 0,
    "server connect": 1,
    "server disconnect": 0,
    "client recv": 0,
    "client disconnected": 1,
  });

  const server = new Server();
  server.on("recv", (clientID, data) => {
    // Should not happen
    expected.received("server recv");
  });
  server.on("connect", (clientID) => {
    expected.received("server connect");
  });
  server.on("disconnect", (clientID) => {
    // Should not happen
    expected.received("server disconnect");
  });

  await server.start();
  await wait(waitTime);

  const client = new Client();
  client.on("recv", (data) => {
    // Should not happen
    expected.received("client recv");
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
  await server.start("127.0.0.1", 0);

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
  await client.connect(host, port);
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
 * Test default socket addresses match.
 */
test("test server and client default address methods", async () => {
  const server = new Server();
  await server.start();

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
