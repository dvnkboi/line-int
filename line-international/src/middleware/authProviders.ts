import { env } from "../utils/index.js";
import { IAuthProvider, IUser } from "./iAuthProvider.js";

const authEnv = env.auth;

const admin = authEnv.token.split(':');

console.log(admin);

export class BearerAuth implements IAuthProvider<{ token: string; }>{
  user: IUser;
  verify(params: { token?: string; }): Promise<boolean> {
    const authHeader = params.token;
    if (!authHeader) {
      return Promise.resolve(false);
    }
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer') {
      return Promise.resolve(false);
    }

    //verify b64 token
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [publicKey, privateKey] = decoded.split(':');

    const isValidPublic = publicKey === admin[0];

    if (!isValidPublic) {
      return Promise.resolve(false);
    }

    const isValidPrivate = privateKey === admin[1];

    if (!isValidPrivate) {
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }
  login(params: { token: string; }): Promise<string> {
    throw new Error("Method not implemented.");
  }
  logout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  register(params: { token: string; }): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  getUser(): Promise<IUser> {
    throw new Error("Method not implemented.");
  }
}