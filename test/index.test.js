const { Client, Server } = require('../dist/index');
const { wait } = require('../dist/wait');
const { Expect } = require('./expect');

const waitTime = 100;

test('test send and receive', async() => {
	const expected = new Expect({
		'server recv':         1,
		'server connect':      1,
		'server disconnect':   1,
		'client recv':         1,
		// 'client disconnected': 1
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
	await server.start('127.0.0.1');
	await wait(waitTime);

	const client = new Client();
	client.on('recv', data => {
		expect(data).toBe('Hello, client!');
		expected.received('client recv');
	});
	client.on('disconnected', () => { // Should not happen
		expected.received('client disconnected');
	});
	await client.connect('127.0.0.1');
	await wait(waitTime);

	await client.send('Hello, server!');
	await server.send('Hello, client!');

	await wait(waitTime);
	await client.disconnect();
	await wait(waitTime);
	await server.stop();
	await wait(waitTime);

	expect(expected.remaining()).toStrictEqual({});
});
