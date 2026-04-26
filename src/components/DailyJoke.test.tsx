import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterAll, afterEach, type Mock } from "vitest";
import DailyJoke from "@/components/DailyJoke";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

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
    const abortSignalMock = vi.fn().mockResolvedValue({
      data: { joke_text: "Test joke" },
      error: null,
    });

    fromMock.mockReturnValue({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => ({
          abortSignal: abortSignalMock,
        })),
      })),
    });

    render(<DailyJoke />);

    expect(await screen.findByText("Test joke")).toBeInTheDocument();
  });

  it("shows fallback text when no joke is available", async () => {
    const abortSignalMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    fromMock.mockReturnValue({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => ({
          abortSignal: abortSignalMock,
        })),
      })),
    });

    render(<DailyJoke />);

    expect(await screen.findByText("No joke available today.")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    const abortSignalMock = vi.fn().mockRejectedValue(new Error("network"));

    fromMock.mockReturnValue({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => ({
          abortSignal: abortSignalMock,
        })),
      })),
    });

    render(<DailyJoke />);

    expect(await screen.findByText("Could not load joke.")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("shows fallback text when joke_text is whitespace only", async () => {
    const abortSignalMock = vi.fn().mockResolvedValue({
      data: { joke_text: "   " },
      error: null,
    });

    fromMock.mockReturnValue({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => ({
          abortSignal: abortSignalMock,
        })),
      })),
    });

    render(<DailyJoke />);

    expect(await screen.findByText("No joke available today.")).toBeInTheDocument();
  });

  it("shows error message and clears loading state when the request times out", async () => {
    vi.useFakeTimers();

    // Never resolves — simulates a request that hangs indefinitely
    const abortSignalMock = vi.fn().mockReturnValue(new Promise(() => {}));

    fromMock.mockReturnValue({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => ({
          abortSignal: abortSignalMock,
        })),
      })),
    });

    render(<DailyJoke />);

    expect(screen.getByText("Loading joke...")).toBeInTheDocument();

    // Advance past the 8-second timeout
    await act(async () => {
      vi.advanceTimersByTime(8100);
    });

    expect(screen.getByText("Could not load joke.")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("does not call setJoke after the component unmounts", async () => {
    let resolveRequest!: (value: { data: null; error: null }) => void;

    const abortSignalMock = vi.fn().mockReturnValue(
      new Promise<{ data: null; error: null }>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    fromMock.mockReturnValue({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => ({
          abortSignal: abortSignalMock,
        })),
      })),
    });

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
