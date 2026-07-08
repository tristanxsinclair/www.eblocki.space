import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Systems from "../Systems";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "t@e.com" }, session: null, loading: false, signOut: vi.fn() }),
}));
vi.mock("@/hooks/usePushRegistration", () => ({ usePushRegistration: () => undefined }));
vi.mock("@/components/eblocki/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

describe("Systems (stub)", () => {
  it("renders the rebuild notice", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Systems />
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(screen.getByText(/System Forge is being rebuilt/i)).toBeInTheDocument();
  });
});
