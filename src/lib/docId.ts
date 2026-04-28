export function docIdFor(url: string, title: string): string {
  let host = "";
  let path = "";
  try {
    const parsed = new URL(url);
    host = parsed.host;
    path = parsed.pathname;
  } catch {
    return `unknown:${djb2Hash(url + "::" + title)}`;
  }

  if (host === "docs.google.com") {
    const match = path.match(/\/document\/d\/([A-Za-z0-9_-]+)/);
    if (match && match[1]) return `gdocs:${match[1]}`;
  }

  if (host === "www.notion.so" || host.endsWith(".notion.site")) {
    const lastSegment = path.split("/").filter(Boolean).pop() ?? "";
    const match = lastSegment.match(/([0-9a-f]{32})$/i);
    if (match && match[1]) return `notion:${match[1]}`;
  }

  if (host === "medium.com" || host.endsWith(".medium.com")) {
    const match = path.match(/\/p\/([A-Za-z0-9]+)/);
    if (match && match[1]) return `medium:${match[1]}`;
  }

  if (host.endsWith(".substack.com")) {
    const match = path.match(/\/post\/(\d+)/);
    if (match && match[1]) return `substack:${match[1]}`;
  }

  if (host.endsWith(".ghost.io")) {
    const match = url.match(/editor\/post\/([A-Za-z0-9]+)/);
    if (match && match[1]) return `ghost:${match[1]}`;
  }

  return `url:${djb2Hash(host + path + "::" + title)}`;
}

function djb2Hash(input: string): string {
  let accumulator = 5381;
  for (let position = 0; position < input.length; position++) {
    accumulator =
      ((accumulator << 5) + accumulator + input.charCodeAt(position)) >>> 0;
  }
  return accumulator.toString(36);
}
