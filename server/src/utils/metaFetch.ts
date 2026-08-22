function escapeForSingleQuotedShell(value: string): string {
  return value.replace(/'/g, "'\\''");
}

function isMetaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "graph.instagram.com" || host === "api.instagram.com" || host === "graph.facebook.com";
  } catch {
    return false;
  }
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("access_token")) {
      parsed.searchParams.set("access_token", "<ACCESS_TOKEN>");
    }
    if (parsed.searchParams.has("client_secret")) {
      parsed.searchParams.set("client_secret", "<CLIENT_SECRET>");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function redactBody(body: BodyInit | null | undefined): string | undefined {
  if (!body) return undefined;

  if (body instanceof URLSearchParams) {
    const redacted = new URLSearchParams(body);
    if (redacted.has("access_token")) redacted.set("access_token", "<ACCESS_TOKEN>");
    if (redacted.has("client_secret")) redacted.set("client_secret", "<CLIENT_SECRET>");
    if (redacted.has("code")) redacted.set("code", "<OAUTH_CODE>");
    return redacted.toString();
  }

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (typeof parsed.access_token === "string") parsed.access_token = "<ACCESS_TOKEN>";
      return JSON.stringify(parsed);
    } catch {
      return body;
    }
  }

  return "<NON_TEXT_BODY>";
}

function headersToEntries(headers: HeadersInit | undefined): Array<[string, string]> {
  if (!headers) return [];
  if (headers instanceof Headers) return Array.from(headers.entries());
  if (Array.isArray(headers)) return headers.map(([key, value]) => [key, value]);
  return Object.entries(headers);
}

function redactHeaderValue(name: string, value: string): string {
  if (name.toLowerCase() === "authorization") {
    return value.replace(/Bearer\s+.+/i, "Bearer <ACCESS_TOKEN>");
  }
  return value;
}

function logMetaCurl(url: string, init: RequestInit | undefined, label?: string): void {
  if (!isMetaUrl(url)) return;

  const method = init?.method ?? "GET";
  const parts = ["curl", "-X", method];

  for (const [name, value] of headersToEntries(init?.headers)) {
    parts.push("-H", `'${escapeForSingleQuotedShell(`${name}: ${redactHeaderValue(name, value)}`)}'`);
  }

  const body = redactBody(init?.body);
  if (body !== undefined) {
    parts.push("--data", `'${escapeForSingleQuotedShell(body)}'`);
  }

  parts.push(`'${escapeForSingleQuotedShell(redactUrl(url))}'`);
  console.log(`[meta-curl]${label ? ` ${label}` : ""} ${parts.join(" ")}`);
}

export async function metaFetch(
  input: string,
  init?: RequestInit,
  label?: string
): Promise<Response> {
  logMetaCurl(input, init, label);
  return fetch(input, init);
}
