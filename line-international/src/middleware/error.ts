import { type Request, type Response, type NextFunction } from "express";
import { HttpException } from "../utils/index.js";


export const errorMiddleware = () => {
  return (err: HttpException, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Something went wrong';
    res.status(status).send({
      status,
      message
    });
  };
};