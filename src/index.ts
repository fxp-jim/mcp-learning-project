import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// 1. Create the server instance
const server = new McpServer ({
    name: "github-issue-viewer",
    version: "0.1.0",
    // 2. Declare the server's capabilities. For now, it supports tools and resources, but has none.
    capabilities: {
        tools: {},
        resources: {},
    },
});

// This is our main function that runs the server
async function main () {
    // 3. Create the transport layer for communication
    const transport = new StdioServerTransport();

    // 4. Connect the server logic (Data Layer) to the transport
    await server.connect(transport);

    // 5. Log message to stderr to confirm the server is running.
    console.error("Github Issue Viewer MCP Server is running on stdio...");
}

// Run the main functio and handle any fatal errors
main().catch((error) => {
    console.error("Fata error in main():", error);
    process.exit(1);
});