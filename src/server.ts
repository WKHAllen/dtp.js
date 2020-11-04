import * as net from 'net';
import * as util from './util';

type onRecvCallback       = (clientID: number, data: string) => void;
type onConnectCallback    = (clientID: number) => void;
type onDisconnectCallback = (clientID: number) => void;

interface clientMap {
	[clientID: number]: net.Socket;
}

interface keyMap {
	[clientID: number]: string;
}

const BACKLOG = 16;

export default class Server {
	private onRecv:       onRecvCallback;
	private onConnect:    onConnectCallback;
	private onDisconnect: onDisconnectCallback;
	private serving:      boolean    = false;
	private server:       net.Server = null;
	private clients:      clientMap  = {};
	private keys:         keyMap     = {};
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
				reject('server is already serving');
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
				reject('server is not serving');
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
				reject('server is not serving');
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
					reject(`client ${clientID} does not exist`);
				}
			}

			wg.wait().then(resolve);
		});
	}

	private onData(clientID: number, data: Buffer): void {
		// TODO: parse data received
		this.onRecv(clientID, data.toString());
	}
}
