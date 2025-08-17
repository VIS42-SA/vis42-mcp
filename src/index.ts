#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { init } from "./mcp.js";
import { initRouter } from "./router.js";

const { server, env } = init();

if (env.STREAMABLE) {
	const app = express();
	app.use(express.json());
	app.use(initRouter(server));

	// Start the server
	const PORT = env.PORT;

	app.listen(PORT, (error) => {
		if (error) {
			console.error("Failed to start server:", error);
			process.exit(1);
		}
		console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT} for endpoint: ${env.ENDPOINT}`);
	});
} else {
	async function main() {
		const transport = new StdioServerTransport();
		await server.connect(transport);

		console.error(`Started graphql mcp server ${env.NAME} for endpoint: ${env.ENDPOINT}`);
	}

	main().catch((error) => {
		console.error(`Fatal error in main(): ${error}`);
		process.exit(1);
	});
}
