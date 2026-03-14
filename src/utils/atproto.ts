import { BrowserOAuthClient } from "@atproto/oauth-client-browser";

const getRedirectUri = () => {
  if (typeof window === "undefined") return "http://127.0.0.1:4321/";
  return window.location.origin + "/";
};

const isLocalDev = () => {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
};

const getClientMetadata = () => {
  const isLocal = isLocalDev();
  const redirectUri = getRedirectUri();
  const scope = "atproto transition:generic rpc:app.bsky.actor.getProfile?aud=did:web:api.bsky.app#bsky_appview";

  if (isLocal) {
    const clientId = `http://localhost?redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    return {
      client_id: clientId,
      client_name: "Tangut Explorer (Local)",
      client_uri: "http://127.0.0.1",
      redirect_uris: [redirectUri],
      scope: scope,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "native",
      dpop_bound_access_tokens: true,
    };
  }

  return {
    client_id: "https://tangut.saxxie.dev/client-metadata.json",
    client_name: "Tangut Explorer",
    client_uri: "https://tangut.saxxie.dev",
    logo_uri: "https://tangut.saxxie.dev/favicon.svg",
    redirect_uris: [redirectUri],
    scope: scope,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
    application_type: "web",
    dpop_bound_access_tokens: true,
  };
};

let clientInstance: BrowserOAuthClient | null = null;

export const getAtprotoClient = async () => {
  if (clientInstance) return clientInstance;

  const metadata = getClientMetadata();
  console.log("[ATProto] Initializing with metadata:", typeof metadata, metadata);

  clientInstance = new BrowserOAuthClient({
    handleResolver: "https://bsky.social",
    clientMetadata: metadata as any,
    responseMode: "query",
  });

  return clientInstance;
};

export const handleAtprotoCallback = async (url: URL | string) => {
  const client = await getAtprotoClient();
  const params = typeof url === "string" ? new URL(url).searchParams : url.searchParams;
  return await client.callback(params);
};
