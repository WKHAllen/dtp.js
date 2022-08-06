import * as crypto from "crypto";

export const BACKLOG = 16;
export const DEFAULT_HOST = "0.0.0.0";
export const DEFAULT_PORT = 29275;

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

export async function newRSAKeys(length: number = 4096): Promise<RSAKeys> {
  return new Promise((resolve, reject) => {
    const passphrase = crypto.randomBytes(256).toString();
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
        passphrase,
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

export function newAESCipher(): AESCipher {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  return { key, iv, cipher, decipher };
}

export function newAESCipherFromKeyIV(
  key: Buffer,
  iv: Buffer
): AESCipherDecipher {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  return { cipher, decipher };
}
