import * as crypto from "crypto";

export const LEN_SIZE = 5;
export const BACKLOG = 16;
export const DEFAULT_SERVER_HOST = "0.0.0.0";
export const DEFAULT_CLIENT_HOST = "127.0.0.1";
export const DEFAULT_PORT = 29275;
export const KEY_SIZE = 32;
export const IV_SIZE = 16;

export interface Address {
  host: string;
  port: number;
}

interface RSAKeys {
  publicKey: string | Buffer | crypto.KeyObject;
  privateKey: string | Buffer | crypto.KeyObject;
}

interface AESCipher {
  key: Buffer;
  iv: Buffer;
  cipher: crypto.Cipher;
  decipher: crypto.Decipher;
}

interface AESCipherDecipher {
  cipher: crypto.Cipher;
  decipher: crypto.Decipher;
}

export function encode_message_size(size: number): Uint8Array {
  let big_size = BigInt(size);
  const encoded_size = new Uint8Array(LEN_SIZE);

  for (let i = 0; i < LEN_SIZE; i++) {
    encoded_size[LEN_SIZE - i - 1] = Number(big_size % BigInt(256));
    big_size >>= BigInt(8);
  }

  return encoded_size;
}

export function decode_message_size(encoded_size: Uint8Array): number {
  let size = BigInt(0);

  for (let i = 0; i < LEN_SIZE; i++) {
    size <<= BigInt(8);
    size += BigInt(encoded_size[i]);
  }

  return Number(size);
}

export class MessageStream {
  private message: Buffer = Buffer.from("");
  private messageLength: number = 0;

  public received(messageSegment?: Buffer): Buffer[] {
    if (messageSegment !== undefined) {
      if (this.message.length === 0) {
        this.messageLength = decode_message_size(
          messageSegment.slice(0, LEN_SIZE)
        );
        this.message = messageSegment.slice(LEN_SIZE);
      } else {
        this.message = Buffer.concat([this.message, messageSegment]);
      }
    }

    if (
      this.message.length > 0 &&
      this.messageLength > 0 &&
      this.message.length >= this.messageLength
    ) {
      const msg = this.message.slice(0, this.messageLength);
      const nextMessage = this.message.slice(this.messageLength);

      if (nextMessage.length >= LEN_SIZE) {
        this.messageLength = decode_message_size(
          nextMessage.slice(0, LEN_SIZE)
        );
        this.message = nextMessage.slice(LEN_SIZE);

        return [msg, ...this.received()];
      } else if (nextMessage.length === 0) {
        this.messageLength = 0;
        this.message = Buffer.from("");

        return [msg];
      } else {
        throw new Error("message segment incomplete");
      }
    } else {
      return [];
    }
  }
}

export async function newRSAKeys(length: number = 4096): Promise<RSAKeys> {
  return new Promise((resolve, reject) => {
    const rsaOptions = {
      modulusLength: length,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
        cipher: "aes-256-cbc",
        passphrase: "",
      },
    };

    crypto.generateKeyPair("rsa", rsaOptions, (err, publicKey, privateKey) => {
      if (err) {
        reject(err);
      } else {
        resolve({ publicKey, privateKey });
      }
    });
  });
}

export function newAESKey(): Buffer {
  return crypto.randomBytes(KEY_SIZE);
}

export function newAESCipher(): AESCipher {
  const key = crypto.randomBytes(KEY_SIZE);
  const iv = crypto.randomBytes(IV_SIZE);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return { key, iv, cipher, decipher };
}

export function newAESCipherFromKeyIV(
  key: Buffer,
  iv: Buffer
): AESCipherDecipher {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return { cipher, decipher };
}

export function aesEncrypt(key: Buffer, plaintext: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_SIZE);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const ciphertext = cipher.update(plaintext);
  const ciphertextWithIV = Buffer.concat([iv, ciphertext, cipher.final()]);
  return ciphertextWithIV;
}

export function aesDecrypt(key: Buffer, ciphertextWithIV: Buffer): Buffer {
  const iv = ciphertextWithIV.slice(0, IV_SIZE);
  const ciphertext = ciphertextWithIV.slice(IV_SIZE);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const plaintext = decipher.update(ciphertext);
  const plaintextFinal = Buffer.concat([plaintext, decipher.final()]);
  return plaintextFinal;
}
