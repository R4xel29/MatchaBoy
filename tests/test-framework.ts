/**
 * Arum Seduh E2E Test Framework
 * Lightweight, robust, zero-dependency TypeScript test harness
 */

export interface TestResult {
  suiteName: string;
  testName: string;
  passed: boolean;
  error?: Error | any;
  durationMs: number;
}

export interface SuiteResult {
  suiteName: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  results: TestResult[];
}

type HookFn = () => void | Promise<void>;
type TestFn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFn;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
  beforeAllHooks: HookFn[];
  afterAllHooks: HookFn[];
  beforeEachHooks: HookFn[];
  afterEachHooks: HookFn[];
}

const registeredSuites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

export function describe(name: string, fn: () => void): void {
  const suite: TestSuite = {
    name,
    tests: [],
    beforeAllHooks: [],
    afterAllHooks: [],
    beforeEachHooks: [],
    afterEachHooks: [],
  };

  const prevSuite = currentSuite;
  currentSuite = suite;
  registeredSuites.push(suite);

  try {
    fn();
  } finally {
    currentSuite = prevSuite;
  }
}

export function it(name: string, fn: TestFn): void {
  if (!currentSuite) {
    throw new Error(`Test "${name}" must be defined inside a describe() block`);
  }
  currentSuite.tests.push({ name, fn });
}

export const test = it;

export function beforeAll(fn: HookFn): void {
  if (currentSuite) {
    currentSuite.beforeAllHooks.push(fn);
  }
}

export function afterAll(fn: HookFn): void {
  if (currentSuite) {
    currentSuite.afterAllHooks.push(fn);
  }
}

export function beforeEach(fn: HookFn): void {
  if (currentSuite) {
    currentSuite.beforeEachHooks.push(fn);
  }
}

export function afterEach(fn: HookFn): void {
  if (currentSuite) {
    currentSuite.afterEachHooks.push(fn);
  }
}

// Deep equality helper
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

export interface AssertionMatchers {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toContain(expected: any): void;
  toMatch(regex: RegExp | string): void;
  toBeGreaterThan(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toHaveLength(expected: number): void;
  toHaveProperty(prop: string, value?: any): void;
  toThrow(expectedError?: string | RegExp | Error): void;
  not: AssertionMatchers;
  rejects: {
    toThrow(expectedError?: string | RegExp | Error): Promise<void>;
  };
}

export function expect(actual: any): AssertionMatchers {
  const createMatchers = (isNot: boolean): AssertionMatchers => ({
    toBe(expected: any) {
      const pass = Object.is(actual, expected);
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be' : 'to be'} ${JSON.stringify(expected)}`
        );
      }
    },

    toEqual(expected: any) {
      const pass = deepEqual(actual, expected);
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to equal' : 'to equal'} ${JSON.stringify(expected)}`
        );
      }
    },

    toBeTruthy() {
      const pass = Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be truthy' : 'to be truthy'}`);
      }
    },

    toBeFalsy() {
      const pass = !Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be falsy' : 'to be falsy'}`);
      }
    },

    toBeNull() {
      const pass = actual === null;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be null' : 'to be null'}`);
      }
    },

    toBeUndefined() {
      const pass = actual === undefined;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be undefined' : 'to be undefined'}`);
      }
    },

    toBeDefined() {
      const pass = actual !== undefined;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to be defined' : 'to be defined'}`);
      }
    },

    toContain(expected: any) {
      let pass = false;
      if (typeof actual === 'string') {
        pass = actual.includes(String(expected));
      } else if (Array.isArray(actual)) {
        pass = actual.some((item) => deepEqual(item, expected));
      } else if (actual instanceof Set) {
        pass = actual.has(expected);
      } else if (actual && typeof actual === 'object') {
        pass = expected in actual;
      }
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} ${isNot ? 'NOT to contain' : 'to contain'} ${JSON.stringify(expected)}`
        );
      }
    },

    toMatch(regex: RegExp | string) {
      const r = typeof regex === 'string' ? new RegExp(regex) : regex;
      const pass = typeof actual === 'string' && r.test(actual);
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected "${actual}" ${isNot ? 'NOT to match pattern' : 'to match pattern'} ${regex.toString()}`
        );
      }
    },

    toBeGreaterThan(expected: number) {
      const pass = typeof actual === 'number' && actual > expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT to be >' : 'to be >'} ${expected}`);
      }
    },

    toBeLessThan(expected: number) {
      const pass = typeof actual === 'number' && actual < expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT to be <' : 'to be <'} ${expected}`);
      }
    },

    toBeGreaterThanOrEqual(expected: number) {
      const pass = typeof actual === 'number' && actual >= expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT to be >=' : 'to be >='} ${expected}`);
      }
    },

    toBeLessThanOrEqual(expected: number) {
      const pass = typeof actual === 'number' && actual <= expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected ${actual} ${isNot ? 'NOT to be <=' : 'to be <='} ${expected}`);
      }
    },

    toHaveLength(expected: number) {
      const len = actual?.length ?? actual?.size ?? 0;
      const pass = len === expected;
      if (isNot ? pass : !pass) {
        throw new Error(`Expected length ${len} ${isNot ? 'NOT to be' : 'to be'} ${expected}`);
      }
    },

    toHaveProperty(prop: string, value?: any) {
      const hasProp = actual && typeof actual === 'object' && prop in actual;
      let pass = hasProp;
      if (hasProp && value !== undefined) {
        pass = deepEqual(actual[prop], value);
      }
      if (isNot ? pass : !pass) {
        throw new Error(
          `Expected property "${prop}" ${value !== undefined ? `with value ${JSON.stringify(value)}` : ''} ${
            isNot ? 'NOT to exist' : 'to exist'
          }`
        );
      }
    },

    toThrow(expectedError?: string | RegExp | Error) {
      if (typeof actual !== 'function') {
        throw new Error(`Expected target to be a function, but got ${typeof actual}`);
      }
      let threw = false;
      let thrownError: any = null;
      try {
        actual();
      } catch (err) {
        threw = true;
        thrownError = err;
      }

      if (isNot ? threw : !threw) {
        throw new Error(
          isNot
            ? `Expected function NOT to throw, but threw: ${thrownError?.message || thrownError}`
            : `Expected function to throw an error, but it did not throw.`
        );
      }

      if (threw && expectedError) {
        const msg = thrownError?.message || String(thrownError);
        if (typeof expectedError === 'string' && !msg.includes(expectedError)) {
          throw new Error(`Expected error message to include "${expectedError}", but got "${msg}"`);
        } else if (expectedError instanceof RegExp && !expectedError.test(msg)) {
          throw new Error(`Expected error message to match ${expectedError.toString()}, but got "${msg}"`);
        }
      }
    },

    get not() {
      return createMatchers(!isNot);
    },

    rejects: {
      async toThrow(expectedError?: string | RegExp | Error) {
        if (!actual || typeof actual.then !== 'function') {
          throw new Error(`Expected target to be a Promise, but got ${typeof actual}`);
        }
        let threw = false;
        let thrownError: any = null;
        try {
          await actual;
        } catch (err) {
          threw = true;
          thrownError = err;
        }

        if (isNot ? threw : !threw) {
          throw new Error(
            isNot
              ? `Expected Promise NOT to reject, but rejected with: ${thrownError?.message || thrownError}`
              : `Expected Promise to reject, but it resolved successfully.`
          );
        }

        if (threw && expectedError) {
          const msg = thrownError?.message || String(thrownError);
          if (typeof expectedError === 'string' && !msg.includes(expectedError)) {
            throw new Error(`Expected rejection message to include "${expectedError}", but got "${msg}"`);
          } else if (expectedError instanceof RegExp && !expectedError.test(msg)) {
            throw new Error(`Expected rejection message to match ${expectedError.toString()}, but got "${msg}"`);
          }
        }
      },
    },
  });

  return createMatchers(false);
}

// Spying & Mocking Utilities
export interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: Parameters<T>[];
    results: { type: 'return' | 'throw'; value: any }[];
  };
  mockReturnValue(val: ReturnType<T>): MockFunction<T>;
  mockResolvedValue(val: any): MockFunction<T>;
  mockImplementation(fn: T): MockFunction<T>;
  mockClear(): void;
}

export function fn<T extends (...args: any[]) => any>(impl?: T): MockFunction<T> {
  let currentImpl = impl || (((..._args: any[]) => undefined) as T);
  const calls: Parameters<T>[] = [];
  const results: { type: 'return' | 'throw'; value: any }[] = [];

  const mockFn = ((...args: Parameters<T>) => {
    calls.push(args);
    try {
      const res = currentImpl(...args);
      results.push({ type: 'return', value: res });
      return res;
    } catch (err) {
      results.push({ type: 'throw', value: err });
      throw err;
    }
  }) as MockFunction<T>;

  mockFn.mock = { calls, results };
  mockFn.mockReturnValue = (val: any) => {
    currentImpl = ((..._args: any[]) => val) as T;
    return mockFn;
  };
  mockFn.mockResolvedValue = (val: any) => {
    currentImpl = ((..._args: any[]) => Promise.resolve(val)) as T;
    return mockFn;
  };
  mockFn.mockImplementation = (newImpl: T) => {
    currentImpl = newImpl;
    return mockFn;
  };
  mockFn.mockClear = () => {
    calls.length = 0;
    results.length = 0;
  };

  return mockFn;
}

// In-Memory High-Fidelity Redis Simulation for Unit & Integration Testing
export class MockRedisStore {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  async get<T = any>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    try {
      return JSON.parse(item.value);
    } catch {
      return item.value as any;
    }
  }

  async set(key: string, value: any, opts?: { ex?: number }): Promise<'OK'> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    this.store.set(key, { value: serialized, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deletedCount = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        deletedCount++;
      }
    }
    return deletedCount;
  }

  async keys(pattern: string): Promise<string[]> {
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matched: string[] = [];
    const now = Date.now();

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.store.delete(key);
        continue;
      }
      if (regexPattern.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }

  async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  size(): number {
    return this.store.size;
  }
}

// Suite Execution Engine
export async function runSuites(suitesToRun?: TestSuite[]): Promise<SuiteResult[]> {
  const suites = suitesToRun || registeredSuites;
  const results: SuiteResult[] = [];

  for (const suite of suites) {
    const startTime = Date.now();
    const suiteResult: SuiteResult = {
      suiteName: suite.name,
      passed: true,
      totalTests: suite.tests.length,
      passedTests: 0,
      failedTests: 0,
      durationMs: 0,
      results: [],
    };

    console.log(`\n\x1b[36m[SUITE]\x1b[0m \x1b[1m${suite.name}\x1b[0m (${suite.tests.length} tests)`);

    try {
      for (const hook of suite.beforeAllHooks) {
        await hook();
      }

      for (const t of suite.tests) {
        const testStartTime = Date.now();
        let passed = true;
        let testError: any = null;

        try {
          for (const hook of suite.beforeEachHooks) {
            await hook();
          }

          await t.fn();

          for (const hook of suite.afterEachHooks) {
            await hook();
          }
        } catch (err: any) {
          passed = false;
          testError = err;
          suiteResult.passed = false;
        }

        const testDuration = Date.now() - testStartTime;
        if (passed) {
          suiteResult.passedTests++;
          console.log(`  \x1b[32m✔\x1b[0m \x1b[90m[PASS]\x1b[0m ${t.name} \x1b[90m(${testDuration}ms)\x1b[0m`);
        } else {
          suiteResult.failedTests++;
          console.log(`  \x1b[31m✖\x1b[0m \x1b[31m[FAIL]\x1b[0m ${t.name} \x1b[90m(${testDuration}ms)\x1b[0m`);
          console.log(`    \x1b[31mError: ${testError?.message || testError}\x1b[0m`);
          if (testError?.stack) {
            const stackLines = testError.stack.split('\n').slice(1, 4).join('\n    ');
            console.log(`    \x1b[90m${stackLines}\x1b[0m`);
          }
        }

        suiteResult.results.push({
          suiteName: suite.name,
          testName: t.name,
          passed,
          error: testError,
          durationMs: testDuration,
        });
      }

      for (const hook of suite.afterAllHooks) {
        await hook();
      }
    } catch (suiteErr: any) {
      suiteResult.passed = false;
      console.log(`  \x1b[31m[SUITE LEVEL ERROR]\x1b[0m ${suiteErr?.message || suiteErr}`);
    }

    suiteResult.durationMs = Date.now() - startTime;
    results.push(suiteResult);
  }

  return results;
}

export function clearRegisteredSuites(): void {
  registeredSuites.length = 0;
}
