import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterAll, afterEach, type Mock } from "vitest";
import DailyJoke from "@/components/DailyJoke";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

/** Build a mock that satisfies the query chain:
 *  supabase.from(...).select(...).eq(...).maybeSingle()
 *  where maybeSingle() is controlled via the returned vi.fn().
 */
function buildChainMock(maybeSingleImpl: () => unknown) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(maybeSingleImpl),
      })),
    })),
  };
}

describe("DailyJoke", () => {
  const fromMock = supabase.from as unknown as Mock;
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    fromMock.mockReset();
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders the daily joke when data is returned", async () => {
    fromMock.mockReturnValue(
      buildChainMock(() => Promise.resolve({ data: { content: "Test joke" }, error: null })),
    );

    render(<DailyJoke />);

    expect(await screen.findByText("Test joke")).toBeInTheDocument();
  });

  it("shows fallback text when no joke is available", async () => {
    fromMock.mockReturnValue(
      buildChainMock(() => Promise.resolve({ data: null, error: null })),
    );

    render(<DailyJoke />);

    expect(await screen.findByText("No joke available today.")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    fromMock.mockReturnValue(
      buildChainMock(() => Promise.reject(new Error("network"))),
    );

    render(<DailyJoke />);

    expect(await screen.findByText("Could not load joke.")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("shows fallback text when content is whitespace only", async () => {
    fromMock.mockReturnValue(
      buildChainMock(() => Promise.resolve({ data: { content: "   " }, error: null })),
    );

    render(<DailyJoke />);

    expect(await screen.findByText("No joke available today.")).toBeInTheDocument();
  });

  it("shows error message and clears loading state when the request times out", async () => {
    vi.useFakeTimers();

    // Never resolves — simulates a request that hangs indefinitely
    fromMock.mockReturnValue(
      buildChainMock(() => new Promise(() => {})),
    );

    render(<DailyJoke />);

    expect(screen.getByText("Loading joke...")).toBeInTheDocument();

    // Advance past the 8-second inner timeout
    await act(async () => {
      vi.advanceTimersByTime(8100);
    });

    expect(screen.getByText("Could not load joke.")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("does not update state after the component unmounts", async () => {
    let resolveRequest!: (value: { data: null; error: null }) => void;

    fromMock.mockReturnValue(
      buildChainMock(
        () =>
          new Promise<{ data: null; error: null }>((resolve) => {
            resolveRequest = resolve;
          }),
      ),
    );

    const { unmount } = render(<DailyJoke />);

    expect(screen.getByText("Loading joke...")).toBeInTheDocument();

    unmount();

    // Resolve with null-null (simulates what Supabase returns for an aborted request)
    // after unmount — this must not log an error or update state
    await act(async () => {
      resolveRequest({ data: null, error: null });
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
