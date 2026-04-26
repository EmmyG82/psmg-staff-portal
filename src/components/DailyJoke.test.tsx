import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterAll, type Mock } from "vitest";
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
});
