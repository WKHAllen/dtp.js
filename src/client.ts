import * as net from 'net';
import * as util from './util';

type onRecvCallback         = (data: string) => void;
type onDisconnectedCallback = () => void;

export default class Client {
	private onRecv:         onRecvCallback;
	private onDisconnected: onDisconnectedCallback;
	private connected:      boolean;
	private conn:           net.Socket;
	private key:            string;

	constructor(onRecv: onRecvCallback, onDisconnected: onDisconnectedCallback) {
		this.onRecv         = onRecv;
		this.onDisconnected = onDisconnected;
	}
}
