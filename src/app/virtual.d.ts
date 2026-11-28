declare module 'virtual:engine-input' {
  import type { EngineInputBundle } from '../engine/browser-input';
  const bundle: EngineInputBundle;
  export default bundle;
}
declare module 'virtual:engine-meta' {
  import type { EngineMeta } from '../engine/browser-input';
  const meta: EngineMeta;
  export default meta;
}
