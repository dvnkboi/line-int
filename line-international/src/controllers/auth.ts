import { type Response } from "express";
import { Controller, Cookies, Get, Params, Post, Res } from "../utils/index.js";

@Controller('/auth')
export class Auth {
  @Post('/me/:name?')
  @Get('/me')
  public async saveMe(@Res() res: Response, @Params('name') name?: string, @Cookies('name') userName?: string) {
    if (!name) {
      return {
        name: userName
      };
    }
    res.cookie('name', name, {
      httpOnly: true,
    });
    return {
      name
    };
  }
}