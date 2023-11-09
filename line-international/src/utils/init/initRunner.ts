export class Initializer {
  private _tasks = [] as (() => Promise<void> | void)[];
  private _isInitialized = false;
  private _isInitializing = false;

  constructor () {
  }

  public addTask(...task: (() => Promise<any> | any)[]) {
    for (const t of task) {
      this._tasks.push(t);
    }
    return this;
  }

  public async run() {
    if (this._isInitialized) return;
    if (this._isInitializing) return;
    this._isInitializing = true;

    for (const task of this._tasks) {
      await task();
    }

    this._isInitialized = true;
    this._isInitializing = false;
  }
}