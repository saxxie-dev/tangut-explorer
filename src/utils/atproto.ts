import { BrowserOAuthClient } from "@atproto/oauth-client-browser";

const SCOPE =
  "atproto transition:generic rpc:app.bsky.actor.getProfile?aud=did:web:api.bsky.app#bsky_appview";
const PRODUCTION_CLIENT_ID =
  "https://tangut.saxxie.dev/client-metadata.json";

const isLocalDev = () => {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  );
};

let clientInstance: BrowserOAuthClient | null = null;
let localRedirectUri: string | undefined;

export const getAtprotoClient = async () => {
  if (clientInstance) return clientInstance;

  if (isLocalDev()) {
    const redirectUri = window.location.origin + "/";
    localRedirectUri = redirectUri;
    clientInstance = await BrowserOAuthClient.load({
      clientId: `http://localhost?redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPE)}`,
      handleResolver: "https://bsky.social",
      responseMode: "query",
    });
  } else {
    clientInstance = await BrowserOAuthClient.load({
      clientId: PRODUCTION_CLIENT_ID,
      handleResolver: "https://bsky.social",
    });
  }

  return clientInstance;
};

export const getLocalRedirectUri = () => localRedirectUri;
