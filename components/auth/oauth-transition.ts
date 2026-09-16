export const OAUTH_TRANSITION_KEY = "cm_oauth_transition_v1";
export const OAUTH_TRANSITION_EVENT = "cm:oauth-transition";

type OAuthTransition = {
  provider: "google" | "kakao";
  startedAt: number;
};

export function startOAuthTransition(provider: OAuthTransition["provider"]) {
  try {
    localStorage.setItem(
      OAUTH_TRANSITION_KEY,
      JSON.stringify({ provider, startedAt: Date.now() } satisfies OAuthTransition),
    );
  } catch {
    // The in-page event still activates the guard when storage is unavailable.
  }
  window.dispatchEvent(new Event(OAUTH_TRANSITION_EVENT));
}

export function clearOAuthTransition() {
  try {
    localStorage.removeItem(OAUTH_TRANSITION_KEY);
  } catch {
    // Ignore storage restrictions.
  }
  window.dispatchEvent(new Event(OAUTH_TRANSITION_EVENT));
}

export function readOAuthTransition(): OAuthTransition | null {
  try {
    const raw = localStorage.getItem(OAUTH_TRANSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OAuthTransition;
    if (
      (parsed.provider !== "google" && parsed.provider !== "kakao") ||
      typeof parsed.startedAt !== "number"
    ) {
      clearOAuthTransition();
      return null;
    }

    // Never trap someone after an abandoned provider flow.
    if (Date.now() - parsed.startedAt > 5 * 60 * 1000) {
      clearOAuthTransition();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
