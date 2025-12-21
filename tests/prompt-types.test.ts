import { describe, it, expectTypeOf } from 'vitest';
import type { PromptFormatter, ContextBundle } from '../src/prompt/types';

describe('Prompt Types', () => {
  it('should have the correct types defined', () => {
    // This is mostly a compile-time check for the existence of types
    expectTypeOf<PromptFormatter>().toBeObject();
    expectTypeOf<ContextBundle>().toBeObject();
  });
});
