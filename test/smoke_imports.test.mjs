// smoke_imports.test.mjs — every src/*.mjs entry must import cleanly.
// Born from issue #1: src/witness.mjs (since archived) imported exports that
// no longer existed in eproc.mjs; the suite stayed 7/7 green — it never
// imported witness.mjs — while BOTH experiment runners crashed on import.
// This pin converts that class of silent rot into loud failure: a missing
// export anywhere in src/ fails this test, not the demo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

test("every src/*.mjs module imports cleanly (missing-export rot fails loud)", async () => {
  const files = readdirSync(SRC).filter((f) => f.endsWith(".mjs")).sort();
  assert.ok(files.length >= 4, `expected the src module entries, found only ${files}`);
  for (const f of files) {
    // dynamic import throws SyntaxError if the module's named imports
    // reference exports that do not exist — exactly the issue-#1 failure
    const mod = await import(path.join(SRC, f));
    assert.ok(mod != null && typeof mod === "object", `${f} must import to a module namespace`);
    assert.ok(Object.keys(mod).length > 0, `${f} must export at least one symbol`);
  }
});
