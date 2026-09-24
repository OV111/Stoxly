import { describe, it, expect, vi } from "vitest";
import { singleflight } from "./singleflight";

/** A promise we resolve/reject by hand, to hold a call "in flight". */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("singleflight", () => {
  it("collapses concurrent calls for the same key into one upstream call", async () => {
    const d = deferred<number>();
    const fn = vi.fn(() => d.promise);

    const calls = [singleflight("k1", fn), singleflight("k1", fn), singleflight("k1", fn)];
    d.resolve(42);

    expect(await Promise.all(calls)).toEqual([42, 42, 42]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not share work between different keys", async () => {
    const fn = vi.fn(async () => "x");
    await Promise.all([singleflight("a", fn), singleflight("b", fn)]);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("releases the key after success so the next call runs fresh", async () => {
    const fn = vi.fn(async () => "x");
    await singleflight("k2", fn);
    await singleflight("k2", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("releases the key after failure, so one error is not cached forever", async () => {
    const failing = vi.fn(async () => {
      throw new Error("upstream down");
    });
    await expect(singleflight("k3", failing)).rejects.toThrow("upstream down");

    await Promise.resolve(); // let the release handler run
    expect(await singleflight("k3", async () => "recovered")).toBe("recovered");
  });
});
