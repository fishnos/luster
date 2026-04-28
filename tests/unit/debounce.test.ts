import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "@/lib/debounce";

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("coalesces rapid calls into one", () => {
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d("a");
    d("b");
    d("c");
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("flush invokes immediately and clears the pending timer", () => {
    const fn = vi.fn();
    const d = debounce(fn, 200);
    d("hello");
    d.flush();
    expect(fn).toHaveBeenCalledWith("hello");
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("cancel drops pending invocation", () => {
    const fn = vi.fn();
    const d = debounce(fn, 50);
    d("x");
    d.cancel();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });
});
