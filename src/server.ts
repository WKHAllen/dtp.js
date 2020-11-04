import * as net from 'net';

type onRecvCallback       = (clientID: number, data: string) => void;
type onConnectCallback    = (clientID: number) => void;
type onDisconnectCallback = (clientID: number) => void;

interface clientMap {
	[clientID: number]: net.Socket;
}

interface keyMap {
	[clientID: number]: string;
}

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
}
