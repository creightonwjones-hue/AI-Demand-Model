// Talks to the engine worker. Only the newest request resolves: a reply to an older request (rapid drags) is dropped.
import { makeGrid } from '../engine/grid';
import type { Conditions, RunResult } from '../engine/types';
import type { Overrides } from './url-state';

export interface RunRequest { id: number; overrides: Overrides }
export interface RunReply { id: number; run: RunResult; conditions: Conditions; /** Data defaults, before the user's paths. */ base?: Conditions; error?: string }

export function createRunClient(post: (req: RunRequest) => void) {
  let next = 0;
  let pending: { id: number; resolve: (r: RunReply) => void; reject: (e: Error) => void } | undefined;
  return {
    request(overrides: Overrides): Promise<RunReply> {
      const id = ++next;
      post({ id, overrides });
      return new Promise<RunReply>((resolve, reject) => { pending = { id, resolve, reject }; });
    },
    onReply(reply: RunReply): void {
      if (!(pending && reply.id === pending.id)) return;
      if (reply.error) { pending.reject(new Error(reply.error)); pending = undefined; return; }
      if (reply.run && typeof reply.run === 'object' && !reply.run.grid) reply = { ...reply, run: { ...reply.run, grid: makeGrid() } };
      pending.resolve(reply);
      pending = undefined;
    },
    /** The worker itself failed (could not load, crashed): reject whatever is waiting. */
    fail(message: string): void {
      if (pending) { pending.reject(new Error(message)); pending = undefined; }
    },
  };
}
