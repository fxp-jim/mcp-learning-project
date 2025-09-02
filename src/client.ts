import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type GitHubToolResult = {
    content: {
        type: "text";
        text: string;
    }[];
};

// The main function for our client application
async function main() {
    // 1. Get the path to the server script from the command line arguments
    const serverScriptPath = process.argv[2];
    if (!serverScriptPath) {
        console.error("Error: Please provide the path to the server script.");
        console.error("Usage: node build/client.js <path_to_server_script>");
        process.exit(1);
    }

    // 2. Create the transport layer, telling it how to run our server
    const transport = new StdioClientTransport({
        command: "node", // or process.execPath
        args: [serverScriptPath],
    });

    // 3. Create the client instance
    const client = new Client({
        name: "github-cli-client",
        version: "0.1.0",
    });

    try {
        // 4. Connect to the server
        await client.connect(transport);
        console.log("Client connected successfully to the server!");
        console.log("\nDiscovering available tools...");
        const { tools } = await client.listTools();

        if (tools.length ===0) {
            console.log("Server has no tools available.");
        } else {
            console.log("Server has the following tools:");
            for (const tool of tools) {
                console.log(`- ${tool.name}: ${tool.description}`);
            };

            console.log("\nCalling the 'get_issue_details' tool...");
            const toolResult = (await client.callTool({
                name: "get_issue_details",
                arguments: {
                    owner: "microsoft",
                    repo: "vscode",
                    issue_number: 1, // Let's get the details for the very first issue!
                },
            })) as GitHubToolResult;

            // The result's content is an array, we'll get the first item
            const firstContentBlock = toolResult.content[0];

            if (firstContentBlock.type === "text") {
                console.log("\n--- Tool Result ---");
                console.log(firstContentBlock.text);
                console.log("--------------------");
            }
        }

        // We will add more logic here soon...
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        // 5. Always ensure we close the connection gracefully
        console.log("Closing connection...");
        await client.close();
    }
}

// Run the main function
main();