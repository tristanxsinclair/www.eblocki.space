import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Systems from "../Systems";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "t@e.com" },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));
vi.mock("@/hooks/usePushRegistration", () => ({ usePushRegistration: () => undefined }));
vi.mock("@/components/eblocki/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/eblocki/system-forge-store", () => ({
  fetchActiveSystem: vi.fn().mockResolvedValue(null),
  listRecentReps: vi.fn().mockResolvedValue([]),
  createSystem: vi.fn(),
  submitRep: vi.fn(),
}));

describe("Systems page", () => {
  it("renders the System Forge hero and does not show the rebuild stub", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Systems />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(
      await screen.findByText(/Build a proof-based training system/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/being rebuilt/i)).not.toBeInTheDocument();
  });
});
