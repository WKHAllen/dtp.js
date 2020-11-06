import * as net from 'net';
import { TypedEmitter } from 'tiny-typed-emitter';
import { BACKLOG, DEFAULT_HOST, DEFAULT_PORT, Address } from './defs';
import { WaitGroup } from './wait';

type onRecvCallback       = (clientID: number, data: any) => void;
type onConnectCallback    = (clientID: number) => void;
type onDisconnectCallback = (clientID: number) => void;

interface ClientMap {
	[clientID: number]: net.Socket;
}

interface KeyMap {
	[clientID: number]: string;
}

interface ServerEvents {
	'recv':       onRecvCallback;
	'connect':    onConnectCallback;
	'disconnect': onDisconnectCallback;
}

export class Server extends TypedEmitter<ServerEvents> {
	private serving:      boolean    = false;
	private server:       net.Server = null;
	private clients:      ClientMap  = {};
	private keys:         KeyMap     = {};
	private nextClientID: number     = 0;

	constructor() {
		super();
	}

	public async start(): Promise<void>;
	public async start(host: string): Promise<void>;
	public async start(port: number): Promise<void>;
	public async start(host: string, port: number): Promise<void>;
	public async start(host: any = DEFAULT_HOST, port: any = DEFAULT_PORT): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.serving) {
				reject(new Error('server is already serving'));
			}

			this.server = net.createServer((conn) => {
				const newClientID = this.nextClientID++;

				this.exchangeKeys(newClientID, conn)
					.then(() => {
						this.clients[newClientID] = conn;

						this.emit('connect', newClientID);
						conn.on('data', (data) => this.onData(newClientID, data));
						conn.on('end', () => {
							this.removeClient(newClientID);
							this.emit('disconnect', newClientID);
						});
					})
					.catch(reject);
			});

			this.serving = true;
			this.server.listen(port, host, BACKLOG, resolve);
		});
	}

	public async stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.serving) {
				reject(new Error('server is not serving'));
			}

			this.serving = false;

			for (const clientID in this.clients) {
				this.clients[clientID].destroy();
			}

			this.clients = {};
			this.keys    = {};

			this.server.close((err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	public async send(data: any, ...clientIDs: number[]): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.serving) {
				reject(new Error('server is not serving'));
			}

			if (clientIDs.length === 0) {
				clientIDs = Object.keys(this.clients).map((clientID) => parseInt(clientID));
			}

			const wg = new WaitGroup();

			for (const clientID of clientIDs) {
				if (clientID in this.clients) {
					const strData = JSON.stringify(data);
					wg.add();
					this.clients[clientID].write(strData, (err) => {
						if (err) {
							reject(err);
						} else {
							wg.done();
						}
					});
				} else {
					reject(new Error(`client ${clientID} does not exist`));
				}
			}

			wg.wait()
				.then(resolve);
		});
	}

	public isServing(): boolean {
		return this.serving;
	}

	public getAddr(): Address {
		if (!this.serving) {
			throw new Error('server is not serving');
		}

		const addr = this.server.address();
		if (typeof addr === 'string') {
			return {
				host: addr,
				port: null
			};
		} else {
			return {
				host: addr.address,
				port: addr.port
			};
		}
	}

	public getClientAddr(clientID: number): Address | string {
		if (!this.serving) {
			throw new Error('server is not serving');
		}

		if (clientID in this.clients) {
			return {
				host: this.clients[clientID].remoteAddress,
				port: this.clients[clientID].remotePort
			}
		} else {
			throw new Error(`client ${clientID} does not exist`);
		}
	}

	public removeClient(clientID: number): void {
		if (!this.serving) {
			throw new Error('server is not serving');
		}

		if (clientID in this.clients) {
			this.clients[clientID].destroy();
			delete this.clients[clientID];
			// TODO: uncomment this when key exchange has been implemented
			// delete this.keys[clientID];
		} else {
			throw new Error(`client ${clientID} does not exist`);
		}
	}

	private onData(clientID: number, dataBuffer: Buffer): void {
		// TODO: parse data received
		const data = JSON.parse(dataBuffer.toString());
		this.emit('recv', clientID, data);
	}

	private async exchangeKeys(clientID: number, conn: net.Socket): Promise<void> {
		return new Promise((resolve, reject) => {
			// TODO: do handshake, exchange keys, and add key record to this.keys
			resolve();
		});
	}
}
