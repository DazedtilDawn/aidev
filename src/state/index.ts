export { StateManager } from './manager.js';
export type { StateManagerOptions } from './manager.js';

export {
  createEmptyInternalState,
  parseInternalState,
  estimateStateTokens,
} from '../schemas/state.js';

export type {
  InternalState,
  CodeContext,
  TaskContext,
  Objective,
  KnownFact,
  OpenQuestion,
  Decision,
  Constraint,
} from '../schemas/state.js';

export { InternalStateManager } from './internal-state.js';
export type { InternalState as XMLInternalState } from './internal-state.js';
