import { describe, expect, it } from "vitest";
import { getNotificationTarget } from "@/components/NotificationBell";

describe("getNotificationTarget", () => {
  it("routes warning notifications to unavailability", () => {
    expect(getNotificationTarget("warning")).toBe("/unavailability");
  });

  it("keeps existing routes for other notification types", () => {
    expect(getNotificationTarget("message")).toBe("/messages");
    expect(getNotificationTarget("shift")).toBe("/roster");
    expect(getNotificationTarget("roster")).toBe("/roster");
    expect(getNotificationTarget("info")).toBe("/dashboard");
  });
});
