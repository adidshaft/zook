declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: "popup";
          }) => void;
          prompt: () => void;
        };
      };
    };
    AppleID?: {
      auth?: {
        init: (options: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{ authorization?: { id_token?: string } }>;
      };
    };
  }
}

export const googleOAuthStateKey = "zook.googleOAuthState";
export const googleOAuthRedirectKey = "zook.googleOAuthRedirect";

export function loadScript(src: string, errorMessage: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    const script = existing ?? document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(errorMessage));
    if (!existing) {
      document.head.appendChild(script);
    }
  });
}

export function randomOAuthValue() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export {};
