import * as net from "net";
import * as crypto from "crypto";
import { TypedEmitter } from "tiny-typed-emitter";
import { DEFAULT_HOST, DEFAULT_PORT, Address, newAESCipher } from "./util";

type onRecvCallback<R = any> = (data: R) => void;
type onDisconnectedCallback = () => void;

interface ClientEvents<R = any> {
  recv: onRecvCallback<R>;
  disconnected: onDisconnectedCallback;
}

export class Client<S = any, R = any> extends TypedEmitter<ClientEvents<R>> {
  private connected: boolean = false;
  private conn: net.Socket | null = null;
  private cipher: crypto.Cipher | null = null;
  private decipher: crypto.Decipher | null = null;

  constructor() {
    super();
  }

  public async connect(): Promise<void>;
  public async connect(host: string): Promise<void>;
  public async connect(port: number): Promise<void>;
  public async connect(host: string, port: number): Promise<void>;
  public async connect(
    host: any = DEFAULT_HOST,
    port: any = DEFAULT_PORT
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        reject(new Error("client is already connected to a server"));
      }

      this.conn = net.connect(port, host, resolve);

      this.exchangeKeys(this.conn)
        .then(() => {
          if (this.conn !== null) {
            this.conn.on("data", (data) => this.onData(data));
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

      const strData = JSON.stringify(data);

      if (this.conn !== null) {
        this.conn.write(strData, (err) => {
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
    // TODO: parse data received
    const data = JSON.parse(dataBuffer.toString());
    this.emit("recv", data);
  }

  private async exchangeKeys(conn: net.Socket): Promise<void> {
    // return new Promise((resolve, reject) => {
    //   conn.once("data", (publicKey) => {
    //     const { key, iv, cipher, decipher } = newAESCipher();
    //     const cipherData = JSON.stringify({
    //       key: key.toString(),
    //       iv: iv.toString(),
    //     });
    //     const encryptedCipherData = crypto.publicEncrypt(
    //       publicKey,
    //       Buffer.from(cipherData)
    //     );
    //     conn.write(encryptedCipherData, (err) => {
    //       if (err) {
    //         reject(err);
    //       } else {
    //         this.cipher = cipher;
    //         this.decipher = decipher;
    //         resolve();
    //       }
    //     });
    //   });
    // });
  }
}
