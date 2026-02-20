// netlify/functions/games.js

let games = [];

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-mindspark-password",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(games),
    };
  }

  if (event.httpMethod === "POST") {
    const pw =
      event.headers["x-mindspark-password"] ||
      event.headers["X-Mindspark-Password"];

    const expected = process.env.MINDS_PW || "game123";

    if (!pw || pw !== expected) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    try {
      const data = JSON.parse(event.body);
      if (Array.isArray(data)) {
        games = data;
      }
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, count: games.length }),
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method Not Allowed" }),
  };
};
