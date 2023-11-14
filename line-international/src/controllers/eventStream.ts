import { Get, Queue, type QueueType, Res, Stream, globalEvents, Auth, BasicAuth, Controller, Container, Logger, Exception } from '../utils/index.js';
import { type Response } from 'express';
import { State } from '../utils/threading/state.js';
import { eventManager } from '../utils/threading/events.js';


type ClientOperation = {
  username: string;
  currentOperation: string;
  operationType: 'delete' | 'update' | 'download' | 'create';
  file: DiscoveredFile;
  date: Date;
};

@Stream('/events')
export class EventStream {

  constructor (private readonly logger: Logger) {
    State.set('operationBacklog', []);
  }

  @Get('/audit')
  async get(@Queue() queue: QueueType<any>, @Res() res: Response, @Auth('basic') auth: BasicAuth) {
    const operationBacklog: ClientOperation[] = await State.get('operationBacklog') || [];

    const eventId = `event-${auth.username}-${Date.now()}`;

    for (const operation of operationBacklog) {
      queue.push(operation);
    }

    eventManager.on(`audit`, async (user: string, operation: string, operationType: ClientOperation['operationType'], file: DiscoveredFile) => {
      const operationBacklog: ClientOperation[] = await State.get('operationBacklog') || [];
      const clientOperation: ClientOperation = {
        username: user,
        currentOperation: operation,
        operationType: operationType,
        file,
        date: new Date()
      };
      queue.push(clientOperation);
      operationBacklog.push(clientOperation);
      if (operationBacklog.length > 25) {
        operationBacklog.shift();
      }
      await State.set('operationBacklog', operationBacklog);
      await this.logger.info('audit', `User ${user} [${operationType}]  -  ${operation}`);
    }, eventId, true);

    res.once('close', () => {
      eventManager.off('audit', eventId);
    });

    return queue;
  }
}