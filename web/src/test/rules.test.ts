import { describe, expect, it } from "vitest";
import { ehMenorDeIdade } from "@/data/rules";

describe("menor de 18 anos", () => {
  const hoje = new Date(2026, 9, 22); // 22/10/2026
  it("17 anos é menor", () => expect(ehMenorDeIdade("2009-01-01", hoje)).toBe(true));
  it("faz 18 amanhã ainda é menor", () => expect(ehMenorDeIdade("2008-10-23", hoje)).toBe(true));
  it("faz 18 hoje já não é menor", () => expect(ehMenorDeIdade("2008-10-22", hoje)).toBe(false));
});
