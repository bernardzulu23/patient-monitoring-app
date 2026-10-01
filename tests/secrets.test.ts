import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

function trackedFiles(): string[] | null {
  try {
    return execFileSync("git", ["ls-files", "-z"], { encoding: "utf-8" })
      .split("\0")
      .filter(Boolean);
  } catch {
    return null;
  }
}

describe("T2 secrets are never committed", () => {
  const files = trackedFiles();

  it("tracks no env files except .env.example", { skip: files === null && "not a git checkout" }, () => {
    const envFiles = files!.filter((f) => {
      const name = f.split("/").pop()!;
      if (name === ".env.example") return false;
      return name.startsWith(".env") || /(^|\.)env$/.test(name) || name.endsWith(".env.local");
    });
    assert.deepEqual(envFiles, []);
  });

  it("tracks no file containing a Neon connection string with a password", { skip: files === null && "not a git checkout" }, () => {
    let output = "";
    try {
      output = execFileSync(
        "git",
        ["grep", "-oE", "postgres(ql)?://[^:\"'[:space:]]+:[^@\"'[:space:]]+@[^\"'[:space:]]*neon\\.tech", "--", "."],
        { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch (err) {
      // git grep exits 1 when nothing matches.
      if ((err as { status?: number }).status !== 1) throw err;
    }
    const realCredentials = output
      .split("\n")
      .filter(Boolean)
      .filter((hit) => !/:\/\/USER:PASSWORD@/.test(hit));
    assert.deepEqual(realCredentials, []);
  });
});
