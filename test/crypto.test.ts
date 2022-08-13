import {
  newRSAKeys,
  rsaEncrypt,
  rsaDecrypt,
  newAESKey,
  aesEncrypt,
  aesDecrypt,
} from "../src/crypto";

test("test RSA", async () => {
  const message = "Hello, RSA!";

  const { publicKey, privateKey } = await newRSAKeys();
  const encrypted = rsaEncrypt(publicKey, Buffer.from(message));
  const decrypted = rsaDecrypt(privateKey, encrypted);
  const decryptedMessage = decrypted.toString();

  expect(decryptedMessage).toBe(message);
});

test("test AES", () => {
  const message = "Hello, AES!";

  const key = newAESKey();
  const encrypted = aesEncrypt(key, Buffer.from(message));
  const decrypted = aesDecrypt(key, encrypted);
  const decryptedMessage = decrypted.toString();

  expect(decryptedMessage).toBe(message);
});
