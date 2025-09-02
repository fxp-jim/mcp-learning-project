import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "node:readline/promises"; // Use the promised-based version

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

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        // 4. Connect to the server
        await client.connect(transport);
        console.log("Client connected successfully to the server!");
        // This loop will run forever until the user types 'quit'
        while (true) {
            const owner = await rl.question("\nEnter GitHub repository owner (or 'quit' to exit): ");
            if (owner.toLowerCase() === 'quit') break;

            const repo = await rl.question("Enter GitHub repository name: ");

            const action = await rl.question("Action: (1) List open issues, (2) Get issue details: ");

            if (action === "1") {
                console.log(`\nFetching issues for ${owner}/${repo}...`);
                const result = (await client.callTool({
                    name: "list_open_issues",
                    arguments: { owner, repo },
                })) as GitHubToolResult;
                
                console.log("\n--- Result ---");
                console.log(result.content[0].text);
                console.log("----------------");
            } else if (action === "2") {
                const issueNumberStr = await rl.question("Enter the issue number: ");
                const issue_number = parseInt(issueNumberStr, 10);

                if (isNaN(issue_number)) {
                    console.error("Invalid number. Please try again.");
                    continue; // Skip to the next loop iteration
                }

                console.log(`\nFetching details for the issue #${issue_number}...`);
                const result = (await client.callTool({
                    name: "get_issue_details",
                    arguments: { owner, repo, issue_number },
                })) as GitHubToolResult;

                console.log("\n--- Result ---");
                console.log(result.content[0].text);
                console.log("----------------");
            } else {
                console.log("Invalid action. Please enter 1 or 2.");
            }
        }
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        // 5. Always ensure we close the connection gracefully
        console.log("Closing connection...");
        rl.close(); // Close the readline interface
        await client.close();
    }
}

// Run the main function
main();