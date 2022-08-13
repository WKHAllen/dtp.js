export const LEN_SIZE = 5;
export const BACKLOG = 16;
export const DEFAULT_SERVER_HOST = "0.0.0.0";
export const DEFAULT_CLIENT_HOST = "127.0.0.1";
export const DEFAULT_PORT = 29275;

export interface Address {
  host: string;
  port: number;
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
