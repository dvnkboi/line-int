export interface IUser {
  name: string;
  email: string;
  role: string;
}


export interface IAuthProvider<T> {
  user: IUser;
  verify(params: T): Promise<boolean>;
  login(params: T): Promise<string>;
  logout(): Promise<boolean>;
  register(params: T): Promise<boolean>;
  getUser(): Promise<IUser>;
}