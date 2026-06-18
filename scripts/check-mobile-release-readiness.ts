import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import {
  type CheckResult,
  env,
  fail,
  isAbsoluteHttpUrl,
  isLocalhostUrl,
  pass,
  renderResult,
  rootDir,
  warn,
} from "./shared";

type ExpoPlugin = string | [string, Record<string, unknown>];

function loadOptionalEnvFile() {
  const envFile = env("ZOOK_MOBILE_RELEASE_ENV_FILE");
  if (!envFile) {
    return;
  }
  const filePath = resolve(rootDir, envFile);
  if (!existsSync(filePath)) {
    throw new Error(`ZOOK_MOBILE_RELEASE_ENV_FILE=${envFile} does not exist.`);
  }
  Object.assign(process.env, parse(readFileSync(filePath, "utf8")), process.env);
}

function pluginConfig(plugins: ExpoPlugin[] | undefined, pluginName: string) {
  for (const plugin of plugins ?? []) {
    if (plugin === pluginName) {
      return {};
    }
    if (Array.isArray(plugin) && plugin[0] === pluginName) {
      return plugin[1] ?? {};
    }
  }
  return undefined;
}

async function checkUrl(label: string, url: string, required = true): Promise<CheckResult> {
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow" });
    if (response.ok) {
      return pass(label, `${url} returned ${response.status}.`);
    }
    const detail = `${url} returned ${response.status}.`;
    return required ? fail(label, detail) : warn(label, detail);
  } catch (error) {
    const detail = `${url} could not be reached: ${error instanceof Error ? error.message : String(error)}`;
    return required ? fail(label, detail) : warn(label, detail);
  }
}

async function checkMobileApiUrl(baseUrl: string): Promise<CheckResult> {
  if (!isAbsoluteHttpUrl(baseUrl)) {
    return fail("Mobile API reachability", "Mobile API URL is missing or invalid.");
  }
  const requestUrl = `${baseUrl.replace(/\/$/, "")}/health`;
  try {
    const response = await fetch(requestUrl, { method: "GET", redirect: "follow" });
    if (response.ok) {
      return pass("Mobile API reachability", `${requestUrl} returned ${response.status}.`);
    }
    return fail("Mobile API reachability", `${requestUrl} returned ${response.status}.`);
  } catch (error) {
    return fail(
      "Mobile API reachability",
      `${requestUrl} could not be reached: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function checkLiveReadiness(baseUrl: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/ready`, {
      method: "GET",
      redirect: "follow",
    });
    if (!response.ok) {
      return [fail("Live readiness", `/api/ready returned ${response.status}.`)];
    }
    const payload = (await response.json()) as {
      data?: {
        ready?: boolean;
        envProfile?: string;
        database?: { reachable?: boolean };
        providers?: Record<string, { status?: string; mode?: string; configured?: boolean }>;
      };
    };
    const data = payload.data;
    results.push(
      data?.ready && data.database?.reachable
        ? pass("Live readiness", `${baseUrl}/api/ready reports production-ready.`)
        : fail("Live readiness", `${baseUrl}/api/ready did not report ready database state.`),
    );
    const providers = data?.providers ?? {};
    for (const name of ["payment", "push", "email", "storage", "rateLimit"] as const) {
      const provider = providers[name];
      results.push(
        provider?.status === "ready" && provider.configured
          ? pass(`Live ${name}`, `${provider.mode ?? "provider"} mode is ready.`)
          : fail(`Live ${name}`, `${name} provider is not ready in /api/ready.`),
      );
    }
    for (const name of ["ai", "sms", "whatsapp"] as const) {
      const provider = providers[name];
      results.push(
        provider?.status === "disabled"
          ? warn(`Live ${name}`, `${name} is intentionally disabled for this release.`)
          : pass(`Live ${name}`, `${provider?.mode ?? "provider"} mode is ${provider?.status ?? "unknown"}.`),
      );
    }
  } catch (error) {
    results.push(
      fail(
        "Live readiness",
        `/api/ready could not be checked: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
  return results;
}

async function main() {
  loadOptionalEnvFile();

  const target = env("ZOOK_MOBILE_RELEASE_TARGET") ?? env("ENV_PROFILE") ?? env("APP_ENV") ?? "production";
  process.env.EXPO_PUBLIC_ENV_PROFILE ??= target;
  process.env.EAS_BUILD_PROFILE ??= target;
  process.env.EXPO_PUBLIC_API_MODE ??= "backend";

  const { default: createConfig } = await import("../apps/mobile/app.config");
  const config = createConfig();
  const extra = (config.extra ?? {}) as Record<string, unknown>;
  const ios = config.ios ?? {};
  const android = config.android ?? {};
  const plugins = config.plugins as ExpoPlugin[] | undefined;
  const results: CheckResult[] = [];
  const isProduction = target === "production";
  const mobileApiBaseUrl = String(extra.mobileApiBaseUrl ?? "");
  const webUrl = String(extra.webUrl ?? "");

  results.push(
    config.name === "Zook" && config.slug === "zook" && config.scheme === "zook"
      ? pass("Expo identity", "Name, slug, and scheme are stable.")
      : fail("Expo identity", "Name, slug, or scheme changed unexpectedly."),
  );
  results.push(
    ios.bundleIdentifier === "com.zook.app" && android.package === "com.zook.app"
      ? pass("Native identifiers", "iOS bundle and Android package are com.zook.app.")
      : fail("Native identifiers", "Native app identifiers are not production values."),
  );
  results.push(
    extra.releaseProfile === target && extra.apiMode === "backend" && extra.offlineDemo === false
      ? pass("Release mode", `${target} build uses backend mode with offline demo disabled.`)
      : fail("Release mode", "Release profile, API mode, or offline demo setting is unsafe."),
  );
  results.push(
    isAbsoluteHttpUrl(mobileApiBaseUrl) && (!isProduction || !isLocalhostUrl(mobileApiBaseUrl))
      ? pass("Mobile API URL", mobileApiBaseUrl)
      : fail("Mobile API URL", "Mobile API URL is missing, local, or invalid."),
  );
  results.push(
    isAbsoluteHttpUrl(webUrl) && (!isProduction || !isLocalhostUrl(webUrl))
      ? pass("Mobile web URL", webUrl)
      : fail("Mobile web URL", "Web URL is missing, local, or invalid."),
  );
  results.push(
    ios.usesAppleSignIn === true
      ? pass("Apple Sign In", "iOS config enables Apple Sign In.")
      : fail("Apple Sign In", "iOS config must keep Apple Sign In enabled."),
  );
  results.push(
    pluginConfig(plugins, "expo-apple-authentication")
      ? pass("Apple Sign In plugin", "Default/iOS config includes native Apple Sign In.")
      : fail("Apple Sign In plugin", "Default/iOS config is missing the Apple Sign In plugin."),
  );
  const previousBuildPlatform = process.env.EAS_BUILD_PLATFORM;
  process.env.EAS_BUILD_PLATFORM = "android";
  const androidTargetConfig = createConfig();
  if (previousBuildPlatform === undefined) {
    delete process.env.EAS_BUILD_PLATFORM;
  } else {
    process.env.EAS_BUILD_PLATFORM = previousBuildPlatform;
  }
  results.push(
    pluginConfig(androidTargetConfig.plugins as ExpoPlugin[] | undefined, "expo-apple-authentication")
      ? fail("Android Apple Sign In", "Android-targeted config must not include Apple Sign In.")
      : pass("Android Apple Sign In", "Android-targeted config excludes Apple Sign In."),
  );
  results.push(
    Array.isArray(ios.associatedDomains) &&
      ios.associatedDomains.includes("applinks:zookfit.in") &&
      ios.associatedDomains.includes("applinks:app.zookfit.in")
      ? pass("Universal links", "iOS associated domains include Zook production domains.")
      : fail("Universal links", "Missing production associated domains."),
  );
  results.push(
    Array.isArray(android.intentFilters) && android.intentFilters.length > 0
      ? pass("Android app links", "Android intent filters are configured.")
      : fail("Android app links", "Android app links are missing."),
  );
  results.push(
    extra.pushEnvironment === (isProduction ? "production" : target === "staging" ? "preview" : "development")
      ? pass("Push environment", `Push environment resolves to ${extra.pushEnvironment}.`)
      : fail("Push environment", "Push environment does not match release target."),
  );
  results.push(
    typeof extra.expoProjectId === "string" && extra.expoProjectId.length > 10
      ? pass("Expo project", "Expo project ID is configured.")
      : fail("Expo project", "Expo project ID is missing."),
  );

  const camera = pluginConfig(plugins, "expo-camera");
  const imagePicker = pluginConfig(plugins, "expo-image-picker");
  const location = pluginConfig(plugins, "expo-location");
  const localAuth = pluginConfig(plugins, "expo-local-authentication");
  const notifications = pluginConfig(plugins, "expo-notifications");
  results.push(
    typeof camera?.cameraPermission === "string" && camera.cameraPermission.includes("Zook")
      ? pass("Camera disclosure", "Camera permission copy is contextual.")
      : fail("Camera disclosure", "Camera permission copy is missing or generic."),
  );
  results.push(
    imagePicker?.photosPermission && imagePicker.cameraPermission
      ? pass("Photo disclosure", "Photo/image picker permission copy is contextual.")
      : fail("Photo disclosure", "Photo/image picker permission copy is incomplete."),
  );
  results.push(
    location?.isAndroidBackgroundLocationEnabled === false &&
      typeof location.locationWhenInUsePermission === "string"
      ? pass("Location scope", "Location is foreground-only with contextual copy.")
      : fail("Location scope", "Location config is too broad or missing disclosure copy."),
  );
  results.push(
    typeof localAuth?.faceIDPermission === "string" && localAuth.faceIDPermission.includes("Zook")
      ? pass("Local authentication disclosure", "Face ID copy is contextual.")
      : fail("Local authentication disclosure", "Face ID disclosure is missing."),
  );
  results.push(
    typeof notifications?.icon === "string" && typeof notifications.color === "string"
      ? pass("Notification branding", "Notification icon and color are configured.")
      : fail("Notification branding", "Notification branding is incomplete."),
  );

  for (const asset of [
    config.icon,
    config.splash?.image,
    android.adaptiveIcon?.foregroundImage,
    android.adaptiveIcon?.backgroundImage,
    android.adaptiveIcon?.monochromeImage,
    notifications?.icon as string | undefined,
  ]) {
    if (asset) {
      const path = resolve(rootDir, "apps/mobile", asset);
      results.push(
        existsSync(path)
          ? pass("Mobile asset", `${asset} exists.`)
          : fail("Mobile asset", `${asset} is missing.`),
      );
    }
  }

  const eas = JSON.parse(readFileSync(resolve(rootDir, "apps/mobile/eas.json"), "utf8")) as {
    build?: Record<string, { channel?: string; env?: Record<string, string> }>;
    submit?: Record<string, unknown>;
  };
  const productionBuild = eas.build?.production;
  results.push(
    productionBuild?.channel === "production" &&
      productionBuild.env?.EXPO_PUBLIC_ENV_PROFILE === "production" &&
      productionBuild.env?.EXPO_PUBLIC_API_MODE === "backend"
      ? pass("EAS production profile", "Production build profile targets backend production.")
      : fail("EAS production profile", "Production EAS build profile is unsafe."),
  );
  results.push(
    eas.submit?.production
      ? pass("EAS submit profile", "Production submit profile exists.")
      : fail("EAS submit profile", "Production submit profile is missing."),
  );

  const storeReadiness = readFileSync(resolve(rootDir, "docs/store-readiness.md"), "utf8");
  for (const phrase of [
    "Apple Privacy Nutrition Label",
    "Google Data Safety form",
    "Age rating questionnaire",
    "iPhone screenshots",
    "Android phone screenshots",
  ]) {
    results.push(
      storeReadiness.includes(phrase)
        ? pass("Store checklist", `${phrase} is tracked.`)
        : fail("Store checklist", `${phrase} is missing from store readiness docs.`),
    );
  }

  const externalEvidenceChecklistPath = resolve(rootDir, "docs/mobile-ui-cleanup-external-evidence-checklist.md");
  if (existsSync(externalEvidenceChecklistPath)) {
    const externalEvidenceChecklist = readFileSync(externalEvidenceChecklistPath, "utf8");
    results.push(pass("External evidence checklist", "Mobile cleanup external evidence checklist exists."));
    for (const phrase of [
      "Live Razorpay Membership Checkout",
      "Live Razorpay Shop Order",
      "Razorpay Dashboard Configuration",
      "Provider Credential Certification",
      "Physical Device QA",
      "Store Console and Release Metadata",
      "Product and Finance Decisions",
    ]) {
      results.push(
        externalEvidenceChecklist.includes(phrase)
          ? pass("External evidence checklist", `${phrase} is tracked.`)
          : fail("External evidence checklist", `${phrase} is missing from the external evidence checklist.`),
      );
    }
  } else {
    results.push(
      fail(
        "External evidence checklist",
        "docs/mobile-ui-cleanup-external-evidence-checklist.md is missing.",
      ),
    );
  }

  const certification = readFileSync(resolve(rootDir, "docs/production-provider-certification.md"), "utf8");
  for (const phrase of [
    "iOS physical device receives foreground notification",
    "Android physical device receives foreground notification",
    "Success webhook activates the correct membership",
    "QR",
  ]) {
    results.push(
      certification.includes(phrase)
        ? pass("Provider checklist", `${phrase} is tracked.`)
        : fail("Provider checklist", `${phrase} is missing from provider certification docs.`),
    );
  }

  results.push(await checkUrl("Privacy URL", `${webUrl.replace(/\/$/, "")}/privacy`));
  results.push(await checkUrl("Terms URL", `${webUrl.replace(/\/$/, "")}/terms`));
  results.push(await checkUrl("Support URL", `${webUrl.replace(/\/$/, "")}/support`));
  if (target !== "local") {
    results.push(await checkMobileApiUrl(mobileApiBaseUrl));
  }

  if (isProduction && isAbsoluteHttpUrl(webUrl)) {
    results.push(...(await checkLiveReadiness(webUrl)));
  }

  if (!env("ZOOK_REAL_DEVICE_PUSH_EVIDENCE")) {
    results.push(
      warn(
        "Real-device push evidence",
        "No ZOOK_REAL_DEVICE_PUSH_EVIDENCE reference was provided.",
        "Attach iOS and Android physical-device notification evidence before store submission.",
      ),
    );
  }
  if (!env("ZOOK_QR_LOW_LIGHT_EVIDENCE")) {
    results.push(
      warn(
        "QR low-light evidence",
        "No ZOOK_QR_LOW_LIGHT_EVIDENCE reference was provided.",
        "Attach physical reception QR low-light evidence before store submission.",
      ),
    );
  }
  if (!env("ZOOK_CHECKOUT_WEBHOOK_EVIDENCE")) {
    results.push(
      warn(
        "Checkout/webhook evidence",
        "No ZOOK_CHECKOUT_WEBHOOK_EVIDENCE reference was provided.",
        "Attach a staging or controlled live Razorpay checkout/webhook event before broad rollout.",
      ),
    );
  }
  if (!env("ZOOK_PROVIDER_CERT_EVIDENCE")) {
    results.push(
      warn(
        "Provider certification evidence",
        "No ZOOK_PROVIDER_CERT_EVIDENCE reference was provided.",
        "Attach storage, Expo push, Sentry, Upstash, email, SMS, and enabled-AI provider certification before broad rollout.",
      ),
    );
  }
  if (!env("ZOOK_STORE_METADATA_EVIDENCE")) {
    results.push(
      warn(
        "Store metadata evidence",
        "No ZOOK_STORE_METADATA_EVIDENCE reference was provided.",
        "Attach App Store and Play Console metadata, screenshots, data-safety, and support/refund evidence before broad rollout.",
      ),
    );
  }
  if (!env("ZOOK_PRODUCT_SCOPE_APPROVAL")) {
    results.push(
      warn(
        "Product scope approval",
        "No ZOOK_PRODUCT_SCOPE_APPROVAL reference was provided.",
        "Attach written approval for Part E scope, GST/e-invoicing scope, historical remediation, and localization launch scope.",
      ),
    );
  }

  for (const result of results) {
    renderResult(result);
  }

  const failures = results.filter((result) => result.status === "fail");
  if (failures.length) {
    console.error(`\nMobile release readiness failed with ${failures.length} blocker(s).`);
    process.exit(1);
  }

  const warnings = results.filter((result) => result.status === "warn");
  console.log(`\nMobile release readiness passed with ${warnings.length} warning(s).`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
