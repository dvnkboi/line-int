import { Get, Queue, type QueueType, Res, Stream, globalEvents } from '../utils/index.js';
import { type Response } from 'express';
import { State } from '../utils/threading/state.js';


type Client = {
  username: string;
  currentOperation: string;
  operationType: 'delete' | 'update' | 'download' | 'create';
};



@Stream('/events')
export class EventStream {
  @Get('/audit')
  async get(@Queue() queue: QueueType<any>, @Res() res: Response) {
    const operationBacklog: Client[] = await State.get('operationBacklog') ?? [];

    const authHeader = res.getHeader('authorization') as string ?? 'Basic unknown:'; // Basic username:password (hashed)
    const username = authHeader.split(' ')[1].split(':')[0];

    const eventId = 'event_' + username;

    for (const operation of operationBacklog) {
      queue.push(operation);
    }
    globalEvents.on(`audit`, async (user: string, operation: string, operationType: Client['operationType']) => {
      const operationBacklog: Client[] = await State.get('operationBacklog') ?? [];
      const clientOperation: Client = {
        username: user,
        currentOperation: operation,
        operationType: operationType
      };
      queue.push(clientOperation);
      operationBacklog.push(clientOperation);
      await State.set('operationBacklog', operationBacklog);
    }, eventId, true);

    res.on('close', () => {
      globalEvents.off('test', eventId);
    });

    return queue;
  }
}
