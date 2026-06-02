import { describe, it, expect } from "vitest";
import { renderTemplate } from "./render";

describe("renderTemplate", () => {
  it("substitutes simple variables", () => {
    const out = renderTemplate("Hei {{candidate.firstName}}!", {
      candidate: { firstName: "Kari" },
    });
    expect(out).toBe("Hei Kari!");
  });

  it("renders multiple namespaces", () => {
    const out = renderTemplate("{{candidate.name}} - {{job.title}}", {
      candidate: { name: "Ola Nordmann" },
      job: { title: "Utvikler" },
    });
    expect(out).toBe("Ola Nordmann - Utvikler");
  });

  it("renders missing keys as empty string", () => {
    const out = renderTemplate("Hei {{candidate.missing}}!", {
      candidate: { firstName: "Kari" },
    });
    expect(out).toBe("Hei !");
  });

  it("tolerates whitespace around variable names", () => {
    const out = renderTemplate("{{  candidate.firstName  }}", {
      candidate: { firstName: "Per" },
    });
    expect(out).toBe("Per");
  });
});
