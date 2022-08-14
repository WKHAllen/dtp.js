# Data Transfer Protocol for JavaScript/TypeScript

Asynchronous event-driven networking interfaces for JavaScript and TypeScript.

## Creating a server

```ts
import { Server } from "dtp.js";

// Create a server that receives strings and returns the length of each string
const server = new Server<number, string>();
server.on("connect", (clientID) => {
  console.log(`Client with ID ${clientID} connected`);
});
server.on("disconnect", (clientID) => {
  console.log(`Client with ID ${clientID} disconnected`);
});
server.on("recv", async (clientID, data) => {
  // Send back the length of the string
  await server.send(data.length, clientID);
});

// Start the server
await server.start("0.0.0.0", 29275);
```

## Creating a client

```ts
import { Client } from "dtp.js";
import * as assert from "assert";

// A message to send to the server
const message = "Hello, server!";

// Create a client that sends a message to the server and receives the length of the message
const client = new Client<string, number>();
client.on("recv", (data) => {
  // Validate the response
  console.log(`Received response from server: ${data}`);
  assert.strictEqual(data, message.length);
});
client.on("disconnected", () => {
  console.error("Unexpectedly disconnected from server");
});

// Connect to the server
await client.connect("127.0.0.1", 29275);
// Send the message to the server
await client.send(message);
```

## Security

Information security comes included. Every message sent over a network interface is encrypted with AES-256. Key exchanges are performed using a 4096-bit RSA key-pair.
