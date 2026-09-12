import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Welcome from "@/pages/Welcome";

const { persist } = vi.hoisted(() => ({ persist: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => ({
    upsert: (payload: unknown) => persist(table, payload),
    update: (payload: unknown) => ({ eq: () => persist(table, payload) }),
  }),
} }));

function renderWelcome() {
  render(<QueryClientProvider client={new QueryClient()}><HelmetProvider><MemoryRouter>
    <Routes><Route path="/" element={<Welcome />} /><Route path="/dashboard" element={<h1>Your day</h1>} /></Routes>
  </MemoryRouter></HelmetProvider></QueryClientProvider>);
}

describe("first-use welcome", () => {
  beforeEach(() => { persist.mockReset().mockResolvedValue({ error: null }); });

  it("saves the student's name, goal, and selected areas before opening Today", async () => {
    renderWelcome();
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.change(screen.getByLabelText("A goal you're working towards"), { target: { value: "Prepare for exams" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Law" }));
    fireEvent.click(screen.getByRole("button", { name: "Start my day" }));
    expect(await screen.findByRole("heading", { name: "Your day" })).toBeInTheDocument();
    expect(persist).toHaveBeenCalledWith("profiles", { full_name: "Alex" });
    expect(persist).toHaveBeenCalledWith("user_modes", [expect.objectContaining({ user_id: "student-1", mode_id: "LAW_MAX", is_active: true })]);
    expect(persist).toHaveBeenCalledWith("user_onboarding_profiles", { user_id: "student-1", goals: ["Prepare for exams"], seen_welcome: true });
  });

  it("keeps input available and does not navigate when saving fails", async () => {
    persist.mockResolvedValueOnce({ error: { message: "Network failure" } });
    renderWelcome();
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Alex" } });
    fireEvent.click(screen.getByRole("button", { name: "Start my day" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't save");
    expect(screen.getByLabelText("Your name")).toHaveValue("Alex");
    expect(screen.queryByRole("heading", { name: "Your day" })).not.toBeInTheDocument();
  });

  it("skipping does not erase existing goals or areas", async () => {
    renderWelcome();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(await screen.findByRole("heading", { name: "Your day" })).toBeInTheDocument();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith("user_onboarding_profiles", { user_id: "student-1", seen_welcome: true });
  });
});
