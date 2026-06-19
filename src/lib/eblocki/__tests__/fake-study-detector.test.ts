import { describe, it, expect } from "vitest";
import {
  classifyStudyActivity,
  STUDY_VERDICT_COPY,
} from "../fake-study-detector";

describe("classifyStudyActivity — weak", () => {
  it("rereading slides is weak", () => {
    const r = classifyStudyActivity({ content: "I reread the slides for 1 hour" });
    expect(r.verdict).toBe("weak");
    expect(r.matchedSignal).toBe("weak_passive_reading");
  });

  it("building a Notion dashboard is weak (organisation displacement)", () => {
    const r = classifyStudyActivity({
      content: "Built a beautiful Notion dashboard for my semester schedule",
    });
    expect(r.verdict).toBe("weak");
    expect(r.matchedSignal).toBe("weak_organisation");
  });

  it("highlighting the textbook is weak", () => {
    const r = classifyStudyActivity({ content: "Spent the morning highlighting the textbook" });
    expect(r.verdict).toBe("weak");
  });

  it("watching a lecture is weak", () => {
    const r = classifyStudyActivity({ content: "Watched the lecture recording while eating" });
    expect(r.verdict).toBe("weak");
    expect(r.matchedSignal).toBe("weak_watching");
  });
});

describe("classifyStudyActivity — useful", () => {
  it("Anki recall is useful", () => {
    const r = classifyStudyActivity({ content: "Did 30 mins of Anki recall on torts" });
    expect(r.verdict).toBe("useful");
    expect(r.matchedSignal).toBe("useful_flashcards");
  });

  it("AI explanation + own-words summary is useful", () => {
    const r = classifyStudyActivity({
      content: "Asked ChatGPT to explain mens rea then summarised in my own words",
    });
    expect(r.verdict).toBe("useful");
  });
});

describe("classifyStudyActivity — strong", () => {
  it("IRAC paragraph from memory is strong", () => {
    const r = classifyStudyActivity({
      content: "Wrote one IRAC paragraph on negligence from memory and applied it to a scenario",
    });
    expect(r.verdict).toBe("strong");
  });

  it("teach-aloud + practice question is strong", () => {
    const r = classifyStudyActivity({
      content: "Taught the concept aloud from memory then did a timed practice question",
    });
    expect(r.verdict).toBe("strong");
  });
});

describe("classifyStudyActivity — elite", () => {
  it("closed-book timed answer with self-mark and rewrite is elite", () => {
    const r = classifyStudyActivity({
      content:
        "Closed-book timed answer on contract formation, self-marked against the rubric, rewrote after feedback",
    });
    expect(r.verdict).toBe("elite");
  });
});

describe("classifyStudyActivity — fallback", () => {
  it("empty input returns weak and does not throw", () => {
    expect(() => classifyStudyActivity({})).not.toThrow();
    expect(classifyStudyActivity({}).verdict).toBe("weak");
    expect(classifyStudyActivity({ content: "" }).verdict).toBe("weak");
  });

  it("null/undefined fields are safe", () => {
    const unsafe = { content: null as unknown as string, title: undefined } as Parameters<typeof classifyStudyActivity>[0];
    expect(classifyStudyActivity(unsafe).verdict).toBe("weak");
  });

  it("long generic action-verb content falls back to useful", () => {
    const padding = "This is a long body. ".repeat(20); // > 250 chars
    const r = classifyStudyActivity({ content: `${padding} I wrote about the topic.` });
    expect(r.verdict).toBe("useful");
    expect(r.matchedSignal).toBe("fallback_action");
  });
});

describe("verdict copy and upgrade command", () => {
  it("each verdict returns the exact required copy", () => {
    expect(classifyStudyActivity({ content: "reread slides" }).verdictCopy).toBe(
      STUDY_VERDICT_COPY.weak,
    );
    expect(classifyStudyActivity({ content: "anki recall" }).verdictCopy).toBe(
      STUDY_VERDICT_COPY.useful,
    );
    expect(classifyStudyActivity({ content: "wrote IRAC from memory" }).verdictCopy).toBe(
      STUDY_VERDICT_COPY.strong,
    );
    expect(
      classifyStudyActivity({
        content: "closed-book timed answer self-marked",
      }).verdictCopy,
    ).toBe(STUDY_VERDICT_COPY.elite);
  });

  it("weak verdict returns a concrete upgrade command", () => {
    const r = classifyStudyActivity({ content: "I reread the slides" });
    expect(r.upgradeCommand.length).toBeGreaterThan(10);
    expect(r.upgradeCommand).toMatch(/memory|paragraph|notes|minute/i);
  });

  it("elite verdict returns an identity-evidence upgrade command", () => {
    const r = classifyStudyActivity({
      content: "Closed-book timed answer, self-marked, rewrote after feedback",
    });
    expect(r.upgradeCommand.length).toBeGreaterThan(10);
  });
});
