import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Define the structure of a GitHub issue from the API
interface GitHubIssue {
    number: number;
    title: string;
    user: {
        login: string;
    };
    html_url: string;
    body: string | null;
}

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

server.registerTool(
    "list_open_issues", // The tool's unique name
    {
        title: "List Open GitHub Issues", // A human-friendly title
        description: "Fetches a list of open issues from a public GitHub repository.",
        // The schema defining the inputs the tools expects
        inputSchema: {
            owner: z.string().describe("The owner of the repository (e.g., 'facebook')"),
            repo: z.string().describe("The name of the repository (e.g., 'react')"),
        },
    },
    // The handler function that runs when the tool is called
    async ({owner, repo}) => {
        // Construct the API URL form the tool's inputs
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=open`;

        try {
            // Fetch data from the GitHub API
            const response = await fetch(apiUrl, {
                headers: {
                    // It's a good practice to set a User-Agent header
                    "User-Agent": "MCP-GitHub-Issue-Viewer-v0.1.0",
                },
            });

            // Check if the request was successful
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            // Parse the JSON response
            const issues = (await response.json()) as GitHubIssue[];

            if (issues.length ===0) {
                return {
                    content: [{type: "text", text: `No open issues found for ${owner}/${repo}.`}],
                };
            }

            // Format the first 5 issues into a string
            const formattedIssues = issues
                .slice(0, 5) // Limit to the 5 most recent issues
                .map(
                    (issue) =>
                        `#${issue.number}: ${issue.title} (by ${issue.user.login})`
                )
                .join("\n");

                const fullResponse = `Found ${issues.length} open issues for ${owner}/${repo}. Show the first 5:\n\n${formattedIssues}`;

                // Return the formatted string in the correct MCP structure
                return {
                    content: [
                        {
                            type: "text",
                            text: fullResponse,
                        },
                    ],
                };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            // Return an error message if the API call fails
            return {
                isError: true, // Tell the client this is an error result
                content: [
                    {
                        type: "text",
                        text: `Faield to fetch issues for ${owner}/${repo}. Reason: ${errorMessage}`,
                    },
                ],
            };
        }
    }
);

server.registerTool(
    "get_issue_details",
    {
        title: "Get GitHub Issue Details.",
        description: "Get details of a given GitHub issue number.",
        inputSchema: {
            owner: z.string().describe("The owner of the repository (e.g., 'facebook')"),
            repo: z.string().describe("The name of the repository (e.g., 'react')"),
            issue_number: z.number().describe("The issue number of a GitHub issue."),
        },
    },

    async ({ owner, repo, issue_number }) => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "MCP-GitHub-Issue-Viewer-v0.1.0",
        },
      });

      if (!response.ok) {
        // Corrected "failed" and "response.status"
        throw new Error(`API request failed with status ${response.status}`);
      }

      const issue = (await response.json()) as GitHubIssue;

      // Corrected the logical OR operator for the body
      const formattedIssueDetail = `#${issue.number}: ${issue.title} (by ${issue.user.login})\n\n---\n\n${issue.body || 'No body content.'}`;

      return {
        content: [
          {
            type: "text",
            text: formattedIssueDetail,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      return {
        isError: true,
        content: [
          {
            type: "text",
            // Corrected "Failed" and used the correct variable
            text: `Failed to fetch issue detail for issue #${issue_number}. Reason: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

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