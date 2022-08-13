import { LEN_SIZE, decode_message_size } from "./util";

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
