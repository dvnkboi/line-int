import { Controller, Get } from "../utils/index.js";
import { Logs } from "../utils/log/logDecorator.js";

@Controller('/health')
export class Healthcheck {

  @Get('/')
  @Logs('server', 'healthcheck', 'debug')
  async index() {
    return 'OK';
  }
}