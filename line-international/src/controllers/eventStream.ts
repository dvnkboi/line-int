import { Get, Queue, type QueueType, Res, Stream, globalEvents, Auth, BasicAuth } from '../utils/index.js';
import { type Response } from 'express';
import { State } from '../utils/threading/state.js';


type ClientOperation = {
  username: string;
  currentOperation: string;
  operationType: 'delete' | 'update' | 'download' | 'create';
  file: DiscoveredFile;
  date: Date;
};



@Stream('/events')
export class EventStream {

  constructor () {
    State.set('operationBacklog', []);
  }

  @Get('/audit')
  async get(@Queue() queue: QueueType<any>, @Res() res: Response, @Auth('basic') auth: BasicAuth) {
    const operationBacklogRaw: ClientOperation[] = await State.get('operationBacklog') ?? [];
    const operationBacklog: ClientOperation[] = operationBacklogRaw instanceof Array ? operationBacklogRaw : [];

    const eventId = 'event_' + auth.username;

    for (const operation of operationBacklog) {
      queue.push(operation);
    }

    globalEvents.on(`audit`, async (user: string, operation: string, operationType: ClientOperation['operationType'], file: DiscoveredFile) => {
      console.log('dispatching event', user, operation, operationType);
      const operationBacklogRaw: ClientOperation[] = await State.get('operationBacklog') ?? [];
      const operationBacklog: ClientOperation[] = operationBacklogRaw instanceof Array ? operationBacklogRaw : [];
      const clientOperation: ClientOperation = {
        username: user,
        currentOperation: operation,
        operationType: operationType,
        file,
        date: new Date()
      };
      queue.push(clientOperation);
      operationBacklog.push(clientOperation);
      await State.set('operationBacklog', operationBacklog);
    }, eventId, true);

    res.once('close', () => {
      console.log('closing event');
      globalEvents.off('test', eventId);
    });

    return queue;
  }
}
