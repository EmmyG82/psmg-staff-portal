import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const logoutMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-id", name: "Test User", email: "test@example.com", role: "staff" },
    logout: logoutMock,
    loading: false,
    login: vi.fn(),
    isAdmin: false,
  }),
}));

const updateUserMock = vi.fn();
const maybeSingleMock = vi.fn().mockResolvedValue({ data: { full_name: "Test User", phone: "123456789" } });
const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
const fromMock = vi.fn().mockReturnValue({ select: selectMock });
const signInWithPasswordMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    auth: {
      updateUser: (...args: unknown[]) => updateUserMock(...args),
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
    },
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import ProfilePage from "@/pages/ProfilePage";

describe("ProfilePage", () => {
  beforeEach(() => {
    logoutMock.mockClear();
    navigateMock.mockClear();
    updateUserMock.mockClear();
    signInWithPasswordMock.mockClear();
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    maybeSingleMock.mockClear();
  });

  it("redirects to login after successful email update", async () => {
    updateUserMock.mockResolvedValue({ data: null, error: null });

    render(<ProfilePage />);

    await waitFor(() => expect(maybeSingleMock).toHaveBeenCalled());

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });

    const button = screen.getByRole("button", { name: /update email/i });
    fireEvent.click(button);

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({ email: "new@example.com" }));
    await waitFor(() => expect(logoutMock).toHaveBeenCalled());
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects to login after successful password change", async () => {
    signInWithPasswordMock.mockResolvedValue({ data: { user: null, session: null }, error: null });
    updateUserMock.mockResolvedValue({ data: null, error: null });

    render(<ProfilePage />);

    await waitFor(() => expect(maybeSingleMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^Current Password$/i), { target: { value: "oldpass123" } });
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: "newpass123" } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: "newpass123" } });

    const button = screen.getByRole("button", { name: /change password/i });
    fireEvent.click(button);

    await waitFor(() => expect(signInWithPasswordMock).toHaveBeenCalledWith({ email: "test@example.com", password: "oldpass123" }));
    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({ password: "newpass123" }));
    await waitFor(() => expect(logoutMock).toHaveBeenCalled());
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login"));
  });
});
