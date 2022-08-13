import * as net from "net";
import * as crypto from "crypto";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  DEFAULT_CLIENT_HOST,
  DEFAULT_PORT,
  Address,
  encode_message_size,
} from "./util";
import { MessageStream } from "./message-stream";
import { newAESKey, aesEncrypt, aesDecrypt } from "./crypto";

type onRecvCallback<R> = (data: R) => void;
type onDisconnectedCallback = () => void;

interface ClientEvents<R> {
  recv: onRecvCallback<R>;
  disconnected: onDisconnectedCallback;
}

export class Client<S, R> extends TypedEmitter<ClientEvents<R>> {
  private connected: boolean = false;
  private conn: net.Socket | null = null;
  private messageStream: MessageStream = new MessageStream();
  private key: Buffer | null = null;

  constructor() {
    super();
  }

  public async connect(): Promise<void>;
  public async connect(host: string): Promise<void>;
  public async connect(port: number): Promise<void>;
  public async connect(host: string, port: number): Promise<void>;
  public async connect(
    host: any = DEFAULT_CLIENT_HOST,
    port: any = DEFAULT_PORT
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        reject(new Error("client is already connected to a server"));
      }

      this.conn = net.connect(port, host, () => {
        if (this.conn === null) {
          throw new Error("client connection not established");
        } else {
          this.exchangeKeys(this.conn)
            .then(() => {
              if (this.conn !== null) {
                this.conn.on("data", (data) => {
                  const msgs = this.messageStream.received(data);

                  for (const msg of msgs) {
                    this.onData(msg);
                  }
                });
                this.conn.on("end", () => {
                  this.connected = false;
                  this.emit("disconnected");
                });

                this.connected = true;
                resolve();
              } else {
                reject(new Error("client has not connected to a server"));
              }
            })
            .catch(reject);
        }
      });
    });
  }

  public async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error("client is not connected to a server"));
      }

      if (this.conn !== null) {
        this.connected = false;
        this.conn.destroy();
        resolve();
      } else {
        reject(new Error("client has not connected to a server"));
      }
    });
  }

  public async send(data: S): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error("client is not connected to a server"));
      }

      if (this.conn !== null && this.key !== null) {
        const strData = JSON.stringify(data);
        const bufData = Buffer.from(strData);
        const encryptedData = aesEncrypt(this.key, bufData);
        const dataBuffer = Buffer.concat([
          encode_message_size(encryptedData.length),
          encryptedData,
        ]);

        this.conn.write(dataBuffer, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        reject(new Error("client has not connected to a server"));
      }
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getAddr(): Address {
    if (!this.connected) {
      throw new Error("client is not connected to a server");
    }

    if (this.conn !== null) {
      const addr = this.conn.address();

      if (Object.keys(addr).length === 0) {
        return {
          host: this.conn.localAddress,
          port: this.conn.localPort,
        };
      } else {
        return {
          host: (addr as net.AddressInfo).address,
          port: (addr as net.AddressInfo).port,
        };
      }
    } else {
      throw new Error("client has not connected to a server");
    }
  }

  public getServerAddr(): Address | null {
    if (!this.connected) {
      throw new Error("client is not connected to a server");
    }

    if (this.conn !== null) {
      const host = this.conn.remoteAddress;
      const port = this.conn.remotePort;

      if (host !== undefined && port !== undefined) {
        return {
          host,
          port,
        };
      } else {
        return null;
      }
    } else {
      throw new Error("client has not connected to a server");
    }
  }

  private onData(dataBuffer: Buffer): void {
    if (this.key !== null) {
      const decryptedData = aesDecrypt(this.key, dataBuffer);
      const data = JSON.parse(decryptedData.toString());
      this.emit("recv", data);
    } else {
      throw new Error("received data but could not find decryption key");
    }
  }

  private async exchangeKeys(conn: net.Socket): Promise<void> {
    return new Promise((resolve, reject) => {
      conn.once("data", (publicKey) => {
        const key = newAESKey();
        const encryptedCipherData = crypto.publicEncrypt(publicKey, key);

        conn.write(encryptedCipherData, (err) => {
          if (err) {
            reject(err);
          } else {
            this.key = key;
            resolve();
          }
        });
      });
    });
  }
}
