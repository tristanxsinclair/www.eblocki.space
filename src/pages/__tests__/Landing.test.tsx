import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Landing from "@/pages/Landing";

vi.mock("@/lib/eblocki/analytics", () => ({ logEvent: vi.fn() }));

describe("public Eblocki system", () => {
  it("shows the life game, the evidence loop, and the full operating system", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Stop fake productivity\.\s*Turn effort into proof\./,
    );
    expect(screen.getByText("Five steps. Two minutes a day.")).toBeInTheDocument();
    expect(screen.getByText("You cannot award yourself progress.")).toBeInTheDocument();
    expect(screen.getByText("Evidence before completion")).toBeInTheDocument();
    expect(screen.getByText("Honest states, always")).toBeInTheDocument();
    expect(screen.getByText("Practice is free, progress is earned")).toBeInTheDocument();
    expect(screen.getByText("One clear instruction.")).toBeInTheDocument();
    expect(screen.getByText("Practice under pressure.")).toBeInTheDocument();
    expect(screen.getByText(/No proof, no progress/)).toBeInTheDocument();
  });
});
