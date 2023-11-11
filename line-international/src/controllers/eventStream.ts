import { Get, Queue, type QueueType, Res, Stream, globalEvents } from '../utils/index.js';
import { type Response } from 'express';
import { State } from '../utils/threading/state.js';


type ClientOperation = {
  username: string;
  currentOperation: string;
  operationType: 'delete' | 'update' | 'download' | 'create';
  file: DiscoveredFile;
};



@Stream('/events')
export class EventStream {

  constructor () {
    State.set('operationBacklog', []);
  }

  @Get('/audit')
  async get(@Queue() queue: QueueType<any>, @Res() res: Response) {
    const operationBacklogRaw: ClientOperation[] = await State.get('operationBacklog') ?? [];
    const operationBacklog: ClientOperation[] = operationBacklogRaw instanceof Array ? operationBacklogRaw : [];

    const authHeader = res.getHeader('authorization') as string ?? 'Basic unknown:'; // Basic username:password (hashed)
    const username = authHeader.split(' ')[1].split(':')[0];

    const eventId = 'event_' + username;

    for (const operation of operationBacklog) {
      queue.push(operation);
    }

    globalEvents.on(`audit`, async (user: string, operation: string, operationType: ClientOperation['operationType'], file: DiscoveredFile) => {
      const operationBacklogRaw: ClientOperation[] = await State.get('operationBacklog') ?? [];
      const operationBacklog: ClientOperation[] = operationBacklogRaw instanceof Array ? operationBacklogRaw : [];
      const clientOperation: ClientOperation = {
        username: user,
        currentOperation: operation,
        operationType: operationType,
        file
      };
      queue.push(clientOperation);
      operationBacklog.push(clientOperation);
      await State.set('operationBacklog', operationBacklog);
    }, eventId, true);

    res.once('close', () => {
      globalEvents.off('test', eventId);
    });

    return queue;
  }
}
