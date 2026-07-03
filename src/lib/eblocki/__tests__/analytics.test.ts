import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}));

import { logEvent } from "../analytics";

describe("analytics privacy", () => {
  beforeEach(() => {
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.from.mockClear();
    mocks.getUser.mockClear();
    mocks.insert.mockClear();
  });

  it("drops raw user text and unapproved properties", async () => {
    await logEvent("coach_prompt_submitted", {
      domain: "law",
      responseMode: "law_reasoning",
      proofActionType: "written_answer",
      rawUserInput: "private thought dump should not be stored",
      notes: "private note should not be stored",
      proofDescription: "raw proof text should not be stored",
      aiResponse: "private assistant response should not be stored",
    });

    expect(mocks.from).toHaveBeenCalledWith("analytics_events");
    expect(mocks.insert).toHaveBeenCalledTimes(1);

    const [payload] = mocks.insert.mock.calls[0] as [{ properties: Record<string, unknown> }];
    expect(payload.properties).toEqual({
      domain: "law",
      responseMode: "law_reasoning",
      proofActionType: "written_answer",
    });
    expect(JSON.stringify(payload.properties)).not.toContain("private");
    expect(JSON.stringify(payload.properties)).not.toContain("raw proof");
  });
});
