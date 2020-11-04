import * as net from 'net';
import * as util from './util';

type onRecvCallback       = (clientID: number, data: string) => void;
type onConnectCallback    = (clientID: number) => void;
type onDisconnectCallback = (clientID: number) => void;

interface ClientMap {
	[clientID: number]: net.Socket
}

interface KeyMap {
	[clientID: number]: string
}

interface Address {
	host: string
	port: number
}

const BACKLOG = 16;

export default class Server {
	private onRecv:       onRecvCallback;
	private onConnect:    onConnectCallback;
	private onDisconnect: onDisconnectCallback;
	private serving:      boolean    = false;
	private server:       net.Server = null;
	private clients:      ClientMap  = {};
	private keys:         KeyMap     = {};
	private nextClientID: number     = 0;

	constructor(onRecv: onRecvCallback, onConnect: onConnectCallback, onDisconnect: onDisconnectCallback) {
		this.onRecv       = onRecv;
		this.onConnect    = onConnect;
		this.onDisconnect = onDisconnect;
	}

	public async start(): Promise<void>;
	public async start(host: string): Promise<void>;
	public async start(port: number): Promise<void>;
	public async start(host: string, port: number): Promise<void>;
	public async start(host: any = '0.0.0.0', port: any = 0): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.serving) {
				reject(new Error('server is already serving'));
			}

			this.server = net.createServer(conn => {
				const newClientID = this.nextClientID++;

				this.clients[newClientID] = conn;
				// TODO: do handshake and add key record to this.keys

				this.onConnect(newClientID);
				conn.on('data', data => this.onData(newClientID, data));
				conn.on('end', () => this.onDisconnect(newClientID));

				conn.pipe(conn);
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

			this.server.close(err => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	public async send(data: string, ...clientIDs: number[]): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.serving) {
				reject(new Error('server is not serving'));
			}

			if (clientIDs.length === 0) {
				clientIDs = Object.keys(this.clients).map(clientID => parseInt(clientID));
			}

			const wg = new util.WaitGroup();

			for (const clientID of clientIDs) {
				if (clientID in this.clients) {
					// TODO: build message
					wg.add();
					this.clients[clientID].write(data, err => {
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

			wg.wait().then(resolve);
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
			const addr = this.clients[clientID].address();
			if (Object.keys(addr).length === 0) {
				return {
					host: null,
					port: null
				}
			} else {
				return {
					host: (addr as net.AddressInfo).address,
					port: (addr as net.AddressInfo).port
				}
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

	private onData(clientID: number, data: Buffer): void {
		// TODO: parse data received
		this.onRecv(clientID, data.toString());
	}
}
