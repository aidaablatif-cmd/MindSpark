// netlify/functions/games.js

let games = []; // in-memory store (note: not permanent across cold starts)

// Use a stable key for merge. Prefer id if present, else url+title.
function keyOf(g) {
  if (g && (typeof g.id === "number" || typeof g.id === "string")) return `id:${g.id}`;
  return `ut:${String(g?.url || "").trim()}|${String(g?.title || "").trim()}`.toLowerCase();
}

function toTime(s) {
  const t = Date.parse(s || "");
  return Number.isFinite(t) ? t : 0;
}

function mergeLists(serverList, incomingList) {
  const map = new Map();

  // start with server
  for (const g of Array.isArray(serverList) ? serverList : []) {
    map.set(keyOf(g), g);
  }

  // merge incoming (newer updatedAt wins)
  for (const g of Array.isArray(incomingList) ? incomingList : []) {
    const k = keyOf(g);
    const existing = map.get(k);
    if (!existing) {
      map.set(k, g);
      continue;
    }
    const existingT = toTime(existing.updatedAt || existing.dateAdded);
    const incomingT = toTime(g.updatedAt || g.dateAdded);
    if (incomingT >= existingT) {
      map.set(k, g);
    }
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => toTime(b.updatedAt || b.dateAdded) - toTime(a.updatedAt || a.dateAdded));
  return merged;
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-mindspark-password",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod === "GET") {
      // Return full list INCLUDING deleted tombstones (clients will hide them)
      return { statusCode: 200, headers, body: JSON.stringify(games) };
    }

    if (event.httpMethod === "POST") {
      const pw =
        event.headers["x-mindspark-password"] ||
        event.headers["X-Mindspark-Password"];

      const expected = process.env.MINDS_PW || "game123";

      if (!pw || pw !== expected) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
      }

      const incoming = event.body ? JSON.parse(event.body) : [];
      games = mergeLists(games, incoming);

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, count: games.length }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
