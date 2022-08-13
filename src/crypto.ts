import * as crypto from "crypto";

export const KEY_SIZE = 32;
export const IV_SIZE = 16;

export interface RSAKeys {
  publicKey: string | Buffer | crypto.KeyObject;
  privateKey: string | Buffer | crypto.KeyObject;
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

export function rsaEncrypt(
  publicKey: string | Buffer | crypto.KeyObject,
  plaintext: Buffer
): Buffer {
  return crypto.publicEncrypt(publicKey, plaintext);
}

export function rsaDecrypt(
  privateKey: string | Buffer | crypto.KeyObject,
  ciphertext: Buffer
): Buffer {
  return crypto.privateDecrypt(
    {
      key: privateKey,
      passphrase: "",
    },
    ciphertext
  );
}

export function newAESKey(): Buffer {
  return crypto.randomBytes(KEY_SIZE);
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
