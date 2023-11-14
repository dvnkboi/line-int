import { Response } from "express";
import { Controller, Get, Logger, Params, Res } from "../utils/index.js";

@Controller('/logs')
export class LogController {

  constructor (private readonly logger: Logger) { }

  @Get('/:tag')
  async get(@Res() res: Response, @Params('tag') tag: string) {

    res.contentType('text/plain');

    for await (const log of this.logger.read(tag)) {
      res.write(log + '\r\n');
    }
    res.end();
  }
}
