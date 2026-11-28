// Talks to the engine worker. Only the newest request resolves: a reply to an older request (rapid drags) is dropped.
import { makeGrid } from '../engine/grid';
import type { Conditions, RunResult } from '../engine/types';
import type { Overrides } from './url-state';

export interface RunRequest { id: number; overrides: Overrides }
export interface RunReply { id: number; run: RunResult; conditions: Conditions; /** Data defaults, before the user's paths. */ base?: Conditions }

export function createRunClient(post: (req: RunRequest) => void) {
  let next = 0;
  let pending: { id: number; resolve: (r: RunReply) => void } | undefined;
  return {
    request(overrides: Overrides): Promise<RunReply> {
      const id = ++next;
      post({ id, overrides });
      return new Promise<RunReply>(resolve => { pending = { id, resolve }; });
    },
    onReply(reply: RunReply): void {
      if (!(pending && reply.id === pending.id)) return;
      if (reply.run && typeof reply.run === 'object' && !reply.run.grid) reply = { ...reply, run: { ...reply.run, grid: makeGrid() } };
      pending.resolve(reply);
      pending = undefined;
    },
  };
}
