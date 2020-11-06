const { Client, Server } = require('../dist/index');
const { wait } = require('../dist/wait');
const { Expect } = require('./expect');

const waitTime = 100;
const host = '127.0.0.1';
const port = 29275;

test('test send and receive', async() => {
	const expected = new Expect({
		'server recv':         1,
		'server connect':      1,
		'server disconnect':   1,
		'client recv':         1,
		'client disconnected': 0
	});

	const server = new Server();
	server.on('recv', (clientID, data) => {
		expect(clientID).toBe(0);
		expect(data).toBe('Hello, server!');
		expected.received('server recv');
	});
	server.on('connect', clientID => {
		expect(clientID).toBe(0);
		expected.received('server connect');
	});
	server.on('disconnect', clientID => {
		expect(clientID).toBe(0);
		expected.received('server disconnect');
	});

	expect(server.isServing()).toBe(false);
	await server.start(host, port);
	expect(server.isServing()).toBe(true);
	await wait(waitTime);

	const client = new Client();
	client.on('recv', data => {
		expect(data).toBe('Hello, client!');
		expected.received('client recv');
	});
	client.on('disconnected', () => { // Should not happen
		expected.received('client disconnected');
	});

	expect(client.isConnected()).toBe(false);
	await client.connect(host, port);
	expect(client.isConnected()).toBe(true);
	await wait(waitTime);

	await client.send('Hello, server!');
	await server.send('Hello, client!');

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
});

test('test client disconnected', async() => {
	const expected = new Expect({
		'server recv':         0,
		'server connect':      1,
		'server disconnect':   0,
		'client recv':         0,
		'client disconnected': 1
	});

	const server = new Server();
	server.on('recv', (clientID, data) => { // Should not happen
		expect(clientID).toBe(0);
		expect(data).toBe('Hello, server!');
		expected.received('server recv');
	});
	server.on('connect', clientID => {
		expect(clientID).toBe(0);
		expected.received('server connect');
	});
	server.on('disconnect', clientID => { // Should not happen
		expect(clientID).toBe(0);
		expected.received('server disconnect');
	});

	expect(server.isServing()).toBe(false);
	await server.start(host, port);
	expect(server.isServing()).toBe(true);
	await wait(waitTime);

	const client = new Client();
	client.on('recv', data => { // Should not happen
		expect(data).toBe('Hello, client!');
		expected.received('client recv');
	});
	client.on('disconnected', () => {
		expected.received('client disconnected');
	});

	expect(client.isConnected()).toBe(false);
	await client.connect(host, port);
	expect(client.isConnected()).toBe(true);

	await wait(waitTime);
	expect(server.isServing()).toBe(true);
	expect(client.isConnected()).toBe(true);
	await server.stop();
	expect(server.isServing()).toBe(false);
	await wait(waitTime);
	expect(client.isConnected()).toBe(false);

	expect(expected.remaining()).toStrictEqual({});
});
