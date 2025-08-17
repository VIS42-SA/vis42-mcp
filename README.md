# vis42-mcp

A Model Context Protocol server that enables LLMs to interact with GraphQL APIs. This implementation provides schema introspection and query execution capabilities, allowing models to discover and use GraphQL APIs dynamically.

## Usage

Run `vis42-mcp` with the correct endpoint, it will automatically try to introspect your queries.

### Environment Variables

| Environment Variable | Description | Default |
|----------|-------------|---------|
| `ENDPOINT` | GraphQL endpoint URL | `http://localhost:3000/graphql` |
| `HEADERS` | JSON string containing headers for requests | `{}` |
| `ALLOW_MUTATIONS` | Enable mutation operations (disabled by default) | `false` |
| `NAME` | Name of the MCP server | `vis42-mcp` |
| `SCHEMA` | Path to a local GraphQL schema file or URL (optional) | - |
| `STREAMABLE` | Enable Streamable HTTP to run it as a local server default is Stdio (disabled by default) | `false` |
| `PORT` | Port number for a Streamable HTTP Endpoint | 3000 |

### Examples

```bash
# Basic usage with a local GraphQL server
ENDPOINT=http://localhost:3000/graphql npx vis42-mcp

# Using with custom headers
ENDPOINT=https://vis42.com/graphql HEADERS='{"Authorization":"Bearer token123"}' npx vis42-mcp

# Enable mutation operations
ENDPOINT=https://vis42.com/graphql ALLOW_MUTATIONS=true npx vis42-mcp

# Using a local schema file instead of introspection
ENDPOINT=http://localhost:3000/graphql SCHEMA=./schema.graphql npx vis42-mcp

# Using a schema file hosted at a URL
ENDPOINT=http://localhost:3000/graphql SCHEMA=https://example.com/schema.graphql npx vis42-mcp

# Running a local Streamable server
ENDPOINT=http://localhost:3000/graphql STREAMABLE=true PORT=4000 npx vis42-mcp
```

## Resources

- **graphql-schema**: The server exposes the GraphQL schema as a resource that clients can access. This is either the local schema file, a schema file hosted at a URL, or based on an introspection query.

## Available Tools

The server provides two main tools:

1. **introspect-schema**: This tool retrieves the GraphQL schema. Use this first if you don't have access to the schema as a resource.
This uses either the local schema file, a schema file hosted at a URL, or an introspection query.

2. **query-graphql**: Execute GraphQL queries against the endpoint. By default, mutations are disabled unless `ALLOW_MUTATIONS` is set to `true`.

## Installation

### Installing Manually

It can be manually installed to Claude:
```json
{
    "mcpServers": {
        "vis42-mcp": {
            "command": "npx",
            "args": ["vis42-mcp"],
            "env": {
                "ENDPOINT": "https://vis42.com/graphql",
                "HEADERS": "{\"Authorization\": \"Bearer token123\"}"
            }
        }
    }
}
```

Use ModelContextProtocol Inspector
```bash
npx @modelcontextprotocol/inspector
npx @modelcontextprotocol/inspector -e ENDPOINT=https://vis42.com/graphql npx vis42-mcp
```

## Security Considerations

Mutations are disabled by default to prevent LLMs from accidentally modifying your database. Only enable mutations in production after careful consideration of the risks.
