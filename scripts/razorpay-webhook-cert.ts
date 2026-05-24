import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

type Fixture = {
  name?: string;
  body: unknown;
  signature?: string;
  expectedStatus?: number;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function stableBody(body: unknown) {
  return typeof body === "string" ? body : JSON.stringify(body);
}

async function loadFixtures(dir: string) {
  const files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => {
      const fixture = JSON.parse(await readFile(join(dir, file), "utf8")) as Fixture;
      return { file, fixture };
    }),
  );
}

async function main() {
  const webhookUrl = requiredEnv("RAZORPAY_WEBHOOK_CERT_URL");
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const fixtureDir = resolve(process.env.RAZORPAY_WEBHOOK_FIXTURE_DIR ?? "fixtures/razorpay");
  const fixtures = await loadFixtures(fixtureDir);
  if (!fixtures.length) throw new Error(`No JSON fixtures found in ${fixtureDir}.`);

  const results: Array<{ file: string; status: number; ok: boolean }> = [];
  for (const { file, fixture } of fixtures) {
    const body = stableBody(fixture.body);
    const signature =
      fixture.signature ??
      (webhookSecret ? createHmac("sha256", webhookSecret).update(body).digest("hex") : "");
    if (!signature) throw new Error(`${file} has no signature and RAZORPAY_WEBHOOK_SECRET is unset.`);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
      },
      body,
    });
    const expectedStatus = fixture.expectedStatus ?? 200;
    results.push({ file, status: response.status, ok: response.status === expectedStatus });
  }

  console.table(results);
  const failed = results.filter((result) => !result.ok);
  if (failed.length) {
    throw new Error(`${failed.length} Razorpay webhook certification fixture(s) failed.`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
