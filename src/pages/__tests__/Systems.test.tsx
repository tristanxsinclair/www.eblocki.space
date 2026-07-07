import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Systems from "../Systems";

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockUser = { id: "user-1", email: "tester@example.com" };
const mockSignOut = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    session: null,
    loading: false,
    signOut: mockSignOut,
  }),
}));

vi.mock("@/hooks/usePushRegistration", () => ({
  usePushRegistration: () => undefined,
}));

vi.mock("@/components/eblocki/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

type SelectResult = {
  data: unknown;
  error: null;
};

const insertedSystems: Array<Record<string, unknown>> = [];
const insertedProofs: Array<Record<string, unknown>> = [];
const insertedReps: Array<Record<string, unknown>> = [];
const updatedSystems: Array<Record<string, unknown>> = [];

let activeSystem: Record<string, unknown> | null = null;
let latestRep: Record<string, unknown> | null = null;
let systemId = 0;
let proofId = 0;
let repId = 0;

function makeSystem(payload: Record<string, unknown>) {
  systemId += 1;
  return {
    id: `system-${systemId}`,
    created_at: "2026-07-07T00:00:00.000Z",
    updated_at: "2026-07-07T00:00:00.000Z",
    ...payload,
  };
}

function makeRep(payload: Record<string, unknown>) {
  repId += 1;
  return {
    id: `rep-${repId}`,
    created_at: "2026-07-07T00:00:00.000Z",
    ...payload,
  };
}

function createSelectChain(table: string, result: () => SelectResult) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result()),
    single: vi.fn(async () => result()),
  };
  return chain;
}

function createInsertChain(table: string, payload: Record<string, unknown>) {
  const chain = {
    select: vi.fn(() => chain),
    single: vi.fn(async () => {
      if (table === "custom_systems") {
        const row = makeSystem(payload);
        activeSystem = row;
        insertedSystems.push(row);
        return { data: row, error: null };
      }

      if (table === "proof_artifacts") {
        proofId += 1;
        const row = { id: `proof-${proofId}`, ...payload };
        insertedProofs.push(row);
        return { data: { id: row.id }, error: null };
      }

      if (table === "system_reps") {
        const row = makeRep(payload);
        latestRep = row;
        insertedReps.push(row);
        return { data: row, error: null };
      }

      return { data: payload, error: null };
    }),
  };
  return chain;
}

function createUpdateChain(table: string, payload: Record<string, unknown>) {
  const chain = {
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => {
      if (table === "custom_systems" && activeSystem) {
        activeSystem = { ...activeSystem, ...payload };
        updatedSystems.push(payload);
        return { data: activeSystem, error: null };
      }
      return { data: null, error: null };
    }),
  };
  return chain;
}

const mockFrom = vi.fn((table: string) => ({
  select: vi.fn(() =>
    createSelectChain(table, () => ({
      data: table === "custom_systems" ? activeSystem : latestRep,
      error: null,
    })),
  ),
  insert: vi.fn((payload: Record<string, unknown>) => createInsertChain(table, payload)),
  update: vi.fn((payload: Record<string, unknown>) => createUpdateChain(table, payload)),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

function renderSystems() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Systems />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Systems page", () => {
  beforeEach(() => {
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    mockFrom.mockClear();
    insertedSystems.length = 0;
    insertedProofs.length = 0;
    insertedReps.length = 0;
    updatedSystems.length = 0;
    activeSystem = null;
    latestRep = null;
    systemId = 0;
    proofId = 0;
    repId = 0;
  });

  it("forges a system and submits the first rep through proof_artifacts and system_reps", async () => {
    renderSystems();

    await screen.findByPlaceholderText("law, sales, spanish...");

    fireEvent.change(screen.getByPlaceholderText("law, sales, spanish..."), { target: { value: "law" } });
    fireEvent.change(screen.getByPlaceholderText("20"), { target: { value: "25" } });
    fireEvent.change(screen.getByPlaceholderText("Improve IRAC answers"), { target: { value: "Improve IRAC answers" } });
    fireEvent.change(screen.getByPlaceholderText("Submit stronger proof weekly"), { target: { value: "Write stronger problem answers" } });
    fireEvent.change(screen.getByPlaceholderText("What makes you avoid the real rep?"), { target: { value: "I reread notes instead of writing" } });

    fireEvent.click(screen.getByRole("button", { name: /Forge My System/i }));

    await screen.findByText("Law Proof System");
    expect(insertedSystems).toHaveLength(1);
    expect(insertedSystems[0].first_command).toMatch(/IRAC paragraph/i);
    expect(insertedSystems[0].first_command).toMatch(/10-minute/i);
    expect(screen.getByRole("button", { name: /Start First Rep/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Start First Rep/i }));

    await screen.findByText("Submit proof");
    fireEvent.change(screen.getByPlaceholderText("Paste the artifact, transcript, log, paragraph, or concrete proof. No artifact, no claim."), {
      target: {
        value:
          "I wrote one IRAC paragraph in 10 minutes using one authority. Issue identified, rule stated, application to facts written, conclusion included, and one correction logged for next time.",
      },
    });
    fireEvent.change(screen.getByPlaceholderText("Optional 1-10"), { target: { value: "7" } });

    fireEvent.click(screen.getByRole("button", { name: /Submit Proof/i }));

    await screen.findByText(/Verdict:/i);
    expect(insertedProofs).toHaveLength(1);
    expect(insertedProofs[0]).toMatchObject({
      user_id: "user-1",
      domain: "law",
      artifact_type: "IRAC paragraph",
    });
    expect(insertedReps).toHaveLength(1);
    expect(insertedReps[0]).toMatchObject({
      user_id: "user-1",
      system_id: "system-1",
      proof_id: "proof-1",
      command: expect.stringMatching(/IRAC paragraph/i),
    });
    expect(updatedSystems[0].active_command).toEqual(insertedReps[0].next_upgrade);
    expect(screen.getByText("Proof saved. Next upgrade selected.")).toBeInTheDocument();
  });
});
