export class HttpException extends Error {
  constructor (public readonly status: number, public readonly message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}