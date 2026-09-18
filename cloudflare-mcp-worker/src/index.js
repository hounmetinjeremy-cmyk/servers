import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Router } from "itty-router";
import { z } from "zod";

const router = Router();

export default {
  async fetch(request, env, ctx) {
    const server = new McpServer({ name: "cloudflare-edge-toolkit", version: "1.0.0" });

    // --- Outils ---
    server.tool("kv_set", "Stocke une valeur", { key: z.string(), value: z.string() }, async ({ key, value }) => {
      await env.STORAGE_KV.put(key, value);
      return { content: [{ type: "text", text: `Stocké: ${key}` }] };
    });

    server.tool("ai_chat", "Chat IA", { prompt: z.string() }, async ({ prompt }) => {
      const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", { messages: [{ role: "user", content: prompt }] });
      return { content: [{ type: "text", text: response.response }] };
    });

    // --- Routes ---
    let transport;

    router.get("/sse", async (req) => {
      transport = new SSEServerTransport("/messages", (response) => {});
      await server.connect(transport);
      return transport.handlePostMessage(req);
    });

    router.post("/messages", async (req) => {
      return transport.handlePostMessage(req);
    });

    return router.handle(request).catch((err) => new Response(err.stack, { status: 500 }));
  }
};
