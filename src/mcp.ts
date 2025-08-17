import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { parse } from "graphql/language";
import { z } from "zod";
import { introspectEndpoint, introspectLocalSchema, introspectSchemaFromUrl } from "./helpers/introspection.js";
import { getVersion } from "./helpers/package.js" with { type: "macro" };

export const init = () => {
	const EnvSchema = z.object({
		NAME: z.string().default("vis42-mcp"),
		ENDPOINT: z.string().url().default("http://localhost/graphql"),
		ALLOW_MUTATIONS: z
			.enum(["true", "false"])
			.transform((value) => value === "true")
			.default("false"),
		HEADERS: z
			.string()
			.default("{}")
			.transform((val) => {
				try {
					return JSON.parse(val);
				} catch (e) {
					throw new Error("HEADERS must be a valid JSON string");
				}
			}),
		SCHEMA: z.string().optional(),
		PORT: z.coerce.number().default(3000),
		STREAMABLE: z
			.enum(["true", "false"])
			.transform((value) => value === "true")
			.default("false"),
	});

	const env = EnvSchema.parse(process.env);

	const server = new McpServer({ name: env.NAME, version: getVersion(), description: `GraphQL MCP server for ${env.ENDPOINT}` });

	server.registerResource(
		"graphql-schema",
		new URL(env.ENDPOINT).href,
		{
			title: "Application GraphQL Schema",
		},
		async (uri, { requestInfo }) => {
			try {
				let schema: string;
				if (env.SCHEMA) {
					if (env.SCHEMA.startsWith("http://") || env.SCHEMA.startsWith("https://")) {
						schema = await introspectSchemaFromUrl(env.SCHEMA);
					} else {
						schema = await introspectLocalSchema(env.SCHEMA);
					}
				} else {
					const headers = env.STREAMABLE ? { Authorization: requestInfo?.headers.authorization } : env.HEADERS;
					schema = await introspectEndpoint(env.ENDPOINT, headers);
				}

				return {
					contents: [{ uri: uri.href, text: schema }],
				};
			} catch (error) {
				throw new Error(`Failed to get GraphQL schema: ${error}`);
			}
		},
	);

	server.registerTool(
		"introspect-schema",
		{
			description: "Introspect the GraphQL schema, use this tool before doing a query to get the schema information if you do not have it available as a resource already.",
			inputSchema: {
				// This is a workaround to help clients that can't handle an empty object as an argument
				// They will often send undefined instead of an empty object which is not allowed by the schema
				__ignore__: z.boolean().default(false).describe("This does not do anything"),
			},
		},
		async (__, { requestInfo }) => {
			try {
				let schema: string;
				if (env.SCHEMA) {
					schema = await introspectLocalSchema(env.SCHEMA);
				} else {
					const headers = env.STREAMABLE ? { Authorization: requestInfo?.headers.authorization } : env.HEADERS;
					schema = await introspectEndpoint(env.ENDPOINT, headers);
				}

				return {
					content: [{ type: "text", text: schema }],
				};
			} catch (error) {
				return {
					isError: true,
					content: [{ type: "text", text: `Failed to introspect schema: ${error}` }],
				};
			}
		},
	);

	server.registerTool(
		"query-graphql",
		{
			description: "Query a GraphQL endpoint with the given query and variables",
			inputSchema: {
				query: z.string(),
				variables: z.string().optional(),
				//bearer: env.STREAMABLE ? z.string() : z.string().optional(),
			},
		},
		async ({ query, variables /*bearer*/ }, { requestInfo }) => {
			try {
				const parsedQuery = parse(query);
				// Check if the query is a mutation
				const isMutation = parsedQuery.definitions.some((def) => def.kind === "OperationDefinition" && def.operation === "mutation");

				if (isMutation && !env.ALLOW_MUTATIONS) {
					return {
						isError: true,
						content: [{ type: "text", text: "Mutations are not allowed unless you enable them in the configuration. Please use a query operation instead." }],
					};
				}
			} catch (error) {
				return {
					isError: true,
					content: [{ type: "text", text: `Invalid GraphQL query: ${error}` }],
				};
			}

			const headers = env.STREAMABLE ? { Authorization: requestInfo?.headers.authorization } : env.HEADERS;
			try {
				const response = await fetch(env.ENDPOINT, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...headers,
					},
					body: JSON.stringify({ query, variables }),
				});

				if (!response.ok) {
					const responseText = await response.text();

					return {
						isError: true,
						content: [{ type: "text", text: `GraphQL request failed: ${response.statusText}\n${responseText}` }],
					};
				}

				const data = await response.json();

				if (data.errors && data.errors.length > 0) {
					// Contains GraphQL errors
					return {
						isError: true,
						content: [{ type: "text", text: `The GraphQL response has errors, please fix the query: ${JSON.stringify(data, null, 2)}` }],
					};
				}

				return {
					content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
				};
			} catch (error) {
				throw new Error(`Failed to execute GraphQL query: ${error}`);
			}
		},
	);

	return { server, env };
};
