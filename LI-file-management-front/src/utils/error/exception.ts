export class Exception<T extends Object> {
  private type: string = 'error';
  private extra: T;
  public errorMessage: string;

  constructor (message: string, type = 'error', extra: T = {} as T) {
    this.errorMessage = message;
    this.extra = extra;
    this.type = type;
  }

  public get(key: keyof T): any {
    return this.extra[key];
  }

  public set(key: string | number, value: any): void {
    (this.extra as any)[key] = value;
  }

  public getExtra(): T {
    return this.extra;
  }

  public getType(): string {
    return this.type;
  }

  static isException(error: any): error is Exception<any> {
    return typeof error.type === 'string' && typeof error.extra === 'object' && typeof error.errorMessage === 'string';
  }

  static fromException<T>(error: Exception<T>): Exception<T> {
    return new Exception(error.errorMessage, error.type, error.extra);
  }
}