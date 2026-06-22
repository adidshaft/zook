/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);
const includeDemo = process.env.EXPO_PUBLIC_INCLUDE_DEMO !== "false";
const demoApiPath = path.resolve(__dirname, "src/lib/demo-api.ts");
const disabledDemoApiPath = path.resolve(__dirname, "src/lib/demo-api-disabled.ts");
const demoModePath = path.resolve(__dirname, "src/lib/demo-mode.ts");
const disabledDemoModePath = path.resolve(__dirname, "src/lib/demo-mode-disabled.ts");
const originalResolveRequest = config.resolver?.resolveRequest;

function modulePath(originModulePath, moduleName) {
  return path.resolve(path.dirname(originModulePath), moduleName);
}

config.resolver = {
  ...config.resolver,
  resolveRequest(context, moduleName, platform) {
    if (!includeDemo && moduleName === "./demo-api" && context.originModulePath.endsWith("src/lib/api.ts")) {
      return {
        filePath: disabledDemoApiPath,
        type: "sourceFile",
      };
    }
    if (!includeDemo && modulePath(context.originModulePath, moduleName) === demoApiPath) {
      return {
        filePath: disabledDemoApiPath,
        type: "sourceFile",
      };
    }
    if (!includeDemo && modulePath(context.originModulePath, moduleName) === demoModePath) {
      return {
        filePath: disabledDemoModePath,
        type: "sourceFile",
      };
    }
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
