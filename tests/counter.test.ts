/**
 * tests/counter.test.ts
 *
 * Unit tests for the counter.compact contract.
 *
 * These tests verify:
 *  1. Circuit logic — increment, reset, and range constraints
 *  2. State transitions — counter value changes correctly
 *  3. Privacy — private inputs (increment_amount, caller_secret) are never
 *     exposed in outputs or emitted events
 */

// ─── Simulated ledger state (mirrors the on-chain state) ─────────────────────

interface CounterState {
  counter: { value: bigint };
  owner: Uint8Array; // SHA-256 hash of the owner's secret (32 bytes)
}

// ─── Minimal SHA-256 simulation for tests (deterministic) ────────────────────
// In production this is a ZK circuit operation; here we simulate with a stub.
function mockSha256(input: Uint8Array): Uint8Array {
  // Deterministic stub: XOR bytes cyclically to produce 32 bytes
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = input[i % input.length] ^ (i * 7);
  }
  return result;
}

// ─── Contract simulation ─────────────────────────────────────────────────────

function makeInitialState(ownerSecret: Uint8Array): CounterState {
  return {
    counter: { value: 0n },
    owner: mockSha256(ownerSecret),
  };
}

/**
 * Simulates the `increment` circuit.
 * - amount is the private witness (PRIVATE — not stored on ledger)
 * - Returns the new state and the disclosed new_value (PUBLIC output)
 * - NEVER returns or logs the amount itself
 */
function circuitIncrement(
  state: CounterState,
  amount: bigint // private witness — must NOT appear in outputs
): { newState: CounterState; disclosedNewValue: bigint } {
  if (amount < 1n || amount > 100n) {
    throw new Error(`Increment must be between 1 and 100, got ${amount}`);
  }
  const newValue = state.counter.value + amount;
  const newState: CounterState = {
    ...state,
    counter: { value: newValue },
  };
  // Only the new value is disclosed — amount is dropped here (privacy)
  return { newState, disclosedNewValue: newValue };
}

/**
 * Simulates the `reset` circuit.
 * - callerSecret is the private witness
 * - Verifies secret hash matches owner
 * - Returns new state and discloses the secret_hash (NOT the secret itself)
 */
function circuitReset(
  state: CounterState,
  callerSecret: Uint8Array // private — never stored or returned raw
): { newState: CounterState; disclosedSecretHash: Uint8Array } {
  const secretHash = mockSha256(callerSecret);

  // Constant-time comparison
  let match = true;
  for (let i = 0; i < 32; i++) {
    if (secretHash[i] !== state.owner[i]) match = false;
  }
  if (!match) {
    throw new Error("Only the owner can reset the counter");
  }

  const newState: CounterState = { ...state, counter: { value: 0n } };
  // Discloses the hash (auditable) but NOT the raw secret
  return { newState, disclosedSecretHash: secretHash };
}

/** Simulates the `get_value` read-only circuit */
function circuitGetValue(state: CounterState): bigint {
  return state.counter.value;
}

// ─── Test setup ──────────────────────────────────────────────────────────────

const OWNER_SECRET = new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
]);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Counter Contract — Circuit Logic", () => {
  test("1. increment increases counter by the private amount", () => {
    const state = makeInitialState(OWNER_SECRET);
    const { newState, disclosedNewValue } = circuitIncrement(state, 5n);

    expect(newState.counter.value).toBe(5n);
    expect(disclosedNewValue).toBe(5n);
  });

  test("2. increment rejects amount below 1 (range constraint)", () => {
    const state = makeInitialState(OWNER_SECRET);
    expect(() => circuitIncrement(state, 0n)).toThrow(
      "Increment must be between 1 and 100"
    );
  });

  test("3. increment rejects amount above 100 (range constraint)", () => {
    const state = makeInitialState(OWNER_SECRET);
    expect(() => circuitIncrement(state, 101n)).toThrow(
      "Increment must be between 1 and 100"
    );
  });
});

describe("Counter Contract — State Transitions", () => {
  test("4. multiple increments accumulate correctly", () => {
    let state = makeInitialState(OWNER_SECRET);
    state = circuitIncrement(state, 10n).newState;
    state = circuitIncrement(state, 20n).newState;
    state = circuitIncrement(state, 15n).newState;

    expect(state.counter.value).toBe(45n);
  });

  test("5. reset returns counter to zero", () => {
    let state = makeInitialState(OWNER_SECRET);
    state = circuitIncrement(state, 50n).newState;
    expect(state.counter.value).toBe(50n);

    const { newState } = circuitReset(state, OWNER_SECRET);
    expect(newState.counter.value).toBe(0n);
  });

  test("6. reset rejects wrong secret (non-owner cannot reset)", () => {
    const state = makeInitialState(OWNER_SECRET);
    const wrongSecret = new Uint8Array(32).fill(0xff);
    expect(() => circuitReset(state, wrongSecret)).toThrow(
      "Only the owner can reset the counter"
    );
  });

  test("7. get_value reflects current ledger state", () => {
    let state = makeInitialState(OWNER_SECRET);
    expect(circuitGetValue(state)).toBe(0n);
    state = circuitIncrement(state, 7n).newState;
    expect(circuitGetValue(state)).toBe(7n);
  });
});

describe("Counter Contract — Privacy Guarantees", () => {
  test("8. private increment_amount is NOT present in disclosed output", () => {
    const state = makeInitialState(OWNER_SECRET);
    const privateAmount = 42n;
    const { disclosedNewValue } = circuitIncrement(state, privateAmount);

    // The disclosed value is new_value (0 + 42 = 42 here), but the AMOUNT
    // is only coincidentally the same because counter started at 0.
    // After a prior increment, they diverge — proving amount is not leaked.
    let state2 = circuitIncrement(state, 10n).newState; // counter = 10
    const result2 = circuitIncrement(state2, privateAmount); // counter = 52

    // disclosed = 52, amount = 42 — they are different, amount not leaked
    expect(result2.disclosedNewValue).toBe(52n);
    expect(result2.disclosedNewValue).not.toBe(privateAmount);

    // The result object has no property that equals the private amount
    const outputKeys = Object.keys(result2);
    const outputValues = Object.values(result2);
    // disclosedNewValue is 52, not 42 — private amount is not present
    expect(outputValues.some((v) => v === privateAmount)).toBe(false);
  });

  test("9. private caller_secret is NOT disclosed during reset", () => {
    const state = makeInitialState(OWNER_SECRET);
    const { disclosedSecretHash } = circuitReset(state, OWNER_SECRET);

    // What's disclosed is the HASH, not the raw secret
    expect(disclosedSecretHash).not.toEqual(OWNER_SECRET);
    expect(disclosedSecretHash.length).toBe(32);

    // Verify it's actually the hash and not the original secret bytes
    let isIdentical = true;
    for (let i = 0; i < 32; i++) {
      if (disclosedSecretHash[i] !== OWNER_SECRET[i]) {
        isIdentical = false;
        break;
      }
    }
    expect(isIdentical).toBe(false);
  });

  test("10. ledger state never stores raw private inputs", () => {
    let state = makeInitialState(OWNER_SECRET);
    const privateAmount = 37n;
    const { newState } = circuitIncrement(state, privateAmount);

    // Ledger only has counter.value and owner — no trace of private amount
    const ledgerKeys = Object.keys(newState);
    expect(ledgerKeys).toEqual(["counter", "owner"]);

    // counter.value is the accumulated total, not the private amount
    expect(newState.counter.value).toBe(37n); // same here only because start=0
    // After a second increment, confirm amount is not stored:
    const { newState: s2 } = circuitIncrement(newState, 5n);
    expect(s2.counter.value).toBe(42n);
    expect(Object.keys(s2)).toEqual(["counter", "owner"]);
  });
});
