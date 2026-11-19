// Run with: npm test
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { type Field, buildAnswersSchema, checkForm, partProgress, resolveParts } from "../lib/item-schema";
import { buildPairwiseForm, checkPairwiseStructure, pairwiseFlags } from "../lib/rubrics/build-pairwise-form";
import { PAIRWISE_TEMPLATES, detectTemplate, formFlags, getTemplate } from "../lib/rubrics";

const EXPECTED: Record<string, { total: number; part1: number; part2: number; part3: number; signoff: number }> = {
  clinical: { total: 58, part1: 21, part2: 21, part3: 15, signoff: 1 },
  "python-code-review": { total: 52, part1: 18, part2: 18, part3: 15, signoff: 1 },
};

/** A complete, internally consistent answer set: no flags should fire for it. */
function completeAnswers(fields: Field[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type === "rating") out[f.id] = 3;
    else if (f.type === "select") out[f.id] = f.options[0];
    else if (f.type === "multiselect") out[f.id] = [f.options[0]];
    else if (f.type === "boolean") out[f.id] = false;
    else out[f.id] = "A specific, written observation about this response.";
  }
  return out;
}

const pick = (answers: Record<string, unknown>, fields: Field[], part: string) =>
  Object.fromEntries(fields.filter((f) => f.part === part).map((f) => [f.id, answers[f.id]]));

test("every config has a test entry", () => {
  assert.deepEqual(PAIRWISE_TEMPLATES.map((t) => t.key).sort(), Object.keys(EXPECTED).sort());
});

for (const config of PAIRWISE_TEMPLATES) {
  describe(`${config.key} form`, () => {
    const form = buildPairwiseForm(config);
    const fields = form.item_schema;
    const parts = form.item_parts;
    const want = EXPECTED[config.key];

    test("field counts", () => {
      assert.equal(fields.length, want.total);
      for (const p of ["part1", "part2", "part3", "signoff"] as const) {
        assert.equal(fields.filter((f) => f.part === p).length, want[p], `fields in ${p}`);
      }
      assert.deepEqual(parts.map((p) => p.id), ["part1", "part2", "part3", "signoff"]);
    });

    test("ids are unique, prefixed by part, and checkForm finds no problems", () => {
      assert.equal(new Set(fields.map((f) => f.id)).size, fields.length);
      const prefix = { part1: "a_", part2: "b_", part3: "c_", signoff: "s_" } as Record<string, string>;
      for (const f of fields) assert.ok(f.id.startsWith(prefix[f.part!]), `${f.id} in ${f.part}`);
      assert.deepEqual(checkForm(fields, parts), []);
    });

    test("part 2 asks the same questions as part 1", () => {
      const a = fields.filter((f) => f.part === "part1");
      const b = fields.filter((f) => f.part === "part2");
      assert.deepEqual(
        b,
        a.map((f) => ({
          ...f,
          part: "part2",
          id: f.id.replace(/^a_/, "b_"),
          label: f.label.replace(/^Response A/, "Response B"),
        }))
      );
    });

    test("parts 1 and 2 have the three groups, ratings with scale labels, text 20-3000", () => {
      const a = fields.filter((f) => f.part === "part1");
      const groups = [...new Set(a.map((f) => f.group))];
      assert.equal(groups.length, 3);
      assert.match(groups[0]!, /^A\. /);
      assert.equal(groups[1], "B. Error and safety classification");
      assert.equal(groups[2], "C. Detailed written assessment");
      for (const f of a.filter((x) => x.group === groups[0])) {
        assert.equal(f.type, "rating");
        if (f.type === "rating") assert.equal(f.scaleLabels?.length, 5);
      }
      for (const f of fields.filter((x) => x.type === "text")) {
        if (f.type === "text") assert.deepEqual([f.minLength, f.maxLength], [20, 3000], f.id);
      }
    });

    test("part 3: preferred, A/B/Tie per dimension, confidence, override, 4 written answers", () => {
      const c = fields.filter((f) => f.part === "part3");
      assert.equal(c[0].id, "c_preferred");
      const compared = c.filter(
        (f) => f.type === "select" && f.options.length === 3 && f.options[0] === "Response A" && f.options[1] === "Response B"
      );
      assert.equal(compared.length, config.comparison.dimensions.length);
      assert.equal(c.filter((f) => f.type === "rating").length, 1);
      assert.ok(c.some((f) => f.id === "c_safety_override"));
      assert.equal(c.filter((f) => f.type === "text").length, 4);
    });

    test("part 3 stays locked until parts 1 and 2 are complete; sign-off until part 3", () => {
      const full = completeAnswers(fields);
      const state = (answers: Record<string, unknown>) =>
        Object.fromEntries(partProgress(fields, parts, answers).map((s) => [s.id, s]));

      let s = state({});
      assert.equal(s.part1.locked, false);
      assert.equal(s.part2.locked, false);
      assert.equal(s.part3.locked, true);
      assert.equal(s.signoff.locked, true);

      s = state(pick(full, fields, "part1"));
      assert.equal(s.part1.complete, true);
      assert.equal(s.part3.locked, true, "part 3 locked with only part 1 done");

      // Part 2 answered except one written answer that is too short: still locked
      const almost = { ...pick(full, fields, "part1"), ...pick(full, fields, "part2"), b_strengths: "too short" };
      assert.equal(state(almost).part3.locked, true, "part 3 locked while part 2 is incomplete");

      s = state({ ...pick(full, fields, "part1"), ...pick(full, fields, "part2") });
      assert.equal(s.part3.locked, false);
      assert.equal(s.signoff.locked, true);

      s = state(full);
      assert.ok(Object.values(s).every((x) => x.complete && !x.locked));
      assert.equal(s.part1.answered, want.part1);
    });

    test("buildAnswersSchema accepts a complete answer set and rejects incomplete ones", () => {
      const schema = buildAnswersSchema(fields);
      const full = completeAnswers(fields);
      assert.equal(schema.safeParse(full).success, true);

      // The server checks every part, whatever the browser's stepper showed
      assert.equal(schema.safeParse(pick(full, fields, "part3")).success, false);
      const { a_critique: _dropped, ...missingOne } = full;
      void _dropped;
      assert.equal(schema.safeParse(missingOne).success, false);
      assert.equal(schema.safeParse({ ...full, c_preferred: "Response C" }).success, false);
      assert.equal(schema.safeParse({ ...full, a_strengths: "short" }).success, false);
      assert.equal(schema.safeParse({ ...full, unexpected: 1 }).success, false);
    });

    test("is detected from its field ids, and flags fire only on inconsistent answers", () => {
      assert.equal(detectTemplate(fields)?.key, config.key);
      assert.equal(getTemplate(config.key), config);
      const full = completeAnswers(fields);
      assert.deepEqual(formFlags(fields, full), []);

      const rules = config.consistency!;
      const err = fields.find((f) => f.id === `a_${rules.errorType}`)!;
      const bad = {
        ...full,
        [`a_${rules.errorType}`]: err.type === "select" ? err.options[1] : undefined,
        [`b_${rules.harm}`]: true,
        c_safety_override: (fields.find((f) => f.id === "c_safety_override") as Extract<Field, { type: "select" }>).options[1],
        [`a_${rules.safetyDimension}`]: 5,
      };
      const flags = pairwiseFlags(config, fields, bad);
      assert.equal(flags.length, 3, flags.join("\n"));
      assert.ok(flags.some((f) => f.startsWith("Response A:")));
      assert.ok(flags.some((f) => f.startsWith("Response B:")));
      assert.ok(flags.some((f) => f.includes("safety override names Response A")));
    });

    test("admins can reword, but not delete or rename parts or fields", () => {
      assert.deepEqual(checkPairwiseStructure(config, fields, parts), []);

      const reworded = fields.map((f) =>
        f.id === "a_critique" ? { ...f, label: "Reworded", help: "New help" } :
        f.type === "select" && f.id === "c_preferred" ? { ...f, options: f.options.map((o) => `${o}!`) } : f
      );
      const introEdited = parts.map((p) => (p.id === "part1" ? { ...p, intro: "New intro" } : p));
      assert.deepEqual(checkPairwiseStructure(config, reworded, introEdited), []);

      assert.notDeepEqual(checkPairwiseStructure(config, fields, parts.filter((p) => p.id !== "part2")), []);
      assert.notDeepEqual(
        checkPairwiseStructure(config, fields, parts.map((p) => (p.id === "part3" ? { ...p, title: "Compare" } : p))),
        []
      );
      assert.notDeepEqual(
        checkPairwiseStructure(config, fields, parts.map((p) => (p.id === "part3" ? { ...p, id: "compare" } : p))),
        []
      );
      assert.notDeepEqual(checkPairwiseStructure(config, fields.filter((f) => f.id !== "b_critique"), parts), []);
      assert.notDeepEqual(
        checkPairwiseStructure(config, fields.map((f) => (f.id === "a_critique" ? { ...f, part: "part2" } : f)), parts),
        []
      );
    });
  });
}

describe("clinical", () => {
  test("output is byte-identical to tests/fixtures/task_form.json", () => {
    const fixture = readFileSync(join(__dirname, "fixtures", "task_form.json"), "utf8");
    const built = JSON.stringify(buildPairwiseForm(getTemplate("clinical")!), null, 2) + "\n";
    assert.equal(built, fixture);
  });
});

describe("python-code-review", () => {
  test("compares every rating dimension head to head", () => {
    const config = getTemplate("python-code-review")!;
    assert.deepEqual(
      config.comparison.dimensions.map((d) => d.id),
      config.dimensions.map((d) => d.id)
    );
  });

  test("steps show the existing work_items payload keys", () => {
    const form = buildPairwiseForm(getTemplate("python-code-review")!);
    const keys = new Set(form.item_parts.flatMap((p) => p.show ?? []));
    assert.deepEqual([...keys].sort(), ["prompt", "response_a", "response_b"]);
  });
});

describe("single-page forms", () => {
  test("a form with no parts keeps the single-page behaviour", () => {
    const fields: Field[] = [
      { id: "score", label: "Score", type: "rating", min: 1, max: 5, required: true },
      { id: "why", label: "Why", type: "text", required: true },
    ];
    assert.deepEqual(resolveParts(fields, []), []);
    assert.deepEqual(checkForm(fields, []), []);
    assert.equal(detectTemplate(fields), undefined);
    assert.deepEqual(formFlags(fields, { score: 3, why: "ok" }), []);
  });
});
