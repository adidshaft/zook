type ResendEmailResponse = {
  id?: string;
  message?: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function hasHeaderAlignment(rawHeaders: string) {
  const lower = rawHeaders.toLowerCase();
  return {
    spf: lower.includes("spf=pass"),
    dkim: lower.includes("dkim=pass"),
    dmarc: lower.includes("dmarc=pass"),
  };
}

async function main() {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const from = requiredEnv("EMAIL_FROM");
  const to = requiredEnv("RESEND_SMOKE_TO");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Zook transactional smoke ${new Date().toISOString()}`,
      text: "Zook transactional email smoke. Confirm receipt and SPF/DKIM/DMARC alignment.",
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as ResendEmailResponse;
  if (!response.ok) {
    throw new Error(payload.message ?? `Resend smoke failed with ${response.status}.`);
  }
  console.log(`Sent Resend smoke email ${payload.id ?? "(no id returned)"} to ${to}.`);

  const headersUrl = process.env.RESEND_SMOKE_HEADERS_URL?.trim();
  if (!headersUrl) {
    console.log("Set RESEND_SMOKE_HEADERS_URL to a raw-message endpoint to auto-check SPF/DKIM/DMARC.");
    return;
  }
  const headersResponse = await fetch(headersUrl);
  const rawHeaders = await headersResponse.text();
  const alignment = hasHeaderAlignment(rawHeaders);
  console.table([alignment]);
  if (!alignment.spf || !alignment.dkim || !alignment.dmarc) {
    throw new Error("One or more SPF/DKIM/DMARC checks did not pass.");
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
