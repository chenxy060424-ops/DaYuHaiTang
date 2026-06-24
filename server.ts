import express from "express";
import path from "path";
import https from "https";
import http from "http";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. API routes FIRST
  app.get("/api/music-proxy", (req, res) => {
    const { id } = req.query;
    if (!id) {
      return res.status(400).send("Missing song id");
    }

    const neteaseUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;

    // Step 1: Request NetEase outer URL to resolve redirect location
    const resolveReq = https.get(neteaseUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://music.163.com"
      }
    }, (resolveRes) => {
      const redirectUrl = resolveRes.headers.location;
      if (!redirectUrl) {
        console.warn(`No redirect location found for NetEase song ${id}, streaming direct.`);
        return streamAudio(neteaseUrl, req, res);
      }

      const secureUrl = redirectUrl.replace(/^http:\/\//i, "https://");
      streamAudio(secureUrl, req, res);
    });

    resolveReq.on("error", (err) => {
      console.error(`Error resolving NetEase redirect for song ${id}:`, err);
      // Fallback to trying to stream direct neteaseUrl
      streamAudio(neteaseUrl, req, res);
    });
  });

  // Helper function to stream/pipe audio from a source URL to the Express response
  function streamAudio(url: string, req: express.Request, res: express.Response) {
    const clientRange = req.headers.range;
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://music.163.com"
    };

    if (clientRange) {
      headers["Range"] = clientRange;
    }

    const protocol = url.startsWith("https") ? https : http;

    const audioReq = protocol.get(url, { headers }, (audioRes) => {
      // Forward status code and content headers
      const statusCode = audioRes.statusCode || 200;
      
      // We only want to stream if the status is successful or partial content
      if (statusCode >= 400) {
        console.warn(`Source server returned error status ${statusCode} for ${url}`);
        return res.status(statusCode).send(`Source server returned error ${statusCode}`);
      }

      res.writeHead(statusCode, audioRes.headers);
      audioRes.pipe(res);
    });

    audioReq.on("error", (err) => {
      console.error(`Stream audio error for ${url}:`, err);
      if (!res.headersSent) {
        res.status(500).send("Error streaming audio");
      }
    });
  }

  // 2. Vite middleware for development or fallback for production assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
