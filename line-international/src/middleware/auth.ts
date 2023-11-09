import { type NextFunction, type Request, type Response } from "express";
import { BearerAuth } from "./authProviders.js";

export const auth = () => async (req: Request, res: Response, next: NextFunction) => {
  // bearer token 
  const BearerTokenAuthenticator = new BearerAuth();



  const token = req.headers.authorization;

  // check if token is valid
  if (token && await BearerTokenAuthenticator.verify({ token })) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};