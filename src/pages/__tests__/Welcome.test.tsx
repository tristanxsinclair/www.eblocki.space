import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Welcome from "@/pages/Welcome";

vi.mock("@/lib/eblocki/analytics", () => ({ logEvent: vi.fn() }));

describe("first-use welcome", () => {
  it("configures arenas and behavioural targets before the first proof cycle", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Welcome />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /life game that cannot lie/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(screen.getByRole("heading", { name: /Where do you want proof/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Law/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(screen.getByRole("heading", { name: /What must the system help/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reduce avoidance/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(screen.getByRole("heading", { name: /first result is a verdict/i })).toBeInTheDocument();
    expect(screen.getByText(/Submit the stronger attempt/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(screen.getByRole("heading", { name: /Progress feels like a game/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start first quest/i })).toBeInTheDocument();
  });
});
