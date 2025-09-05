import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from 'node:fs';
import dotenv from 'dotenv';

try {
    if (fs.existsSync('.env')) {
        const envFileContent = fs.readFileSync('.env');
        const envConfig = dotenv.parse(envFileContent);
        for (const key in envConfig) {
            process.env[key] = envConfig[key];
        }
        console.error('Successfully loaded environment variables from .env file.');
    }
} catch (e) {
    console.error('Failed to load or parse .env file:', e);
}

// Define the structure of a GitHub issue from the API
interface GitHubIssue {
    number: number;
    title: string;
    user: {
        login: string;
    };
    html_url: string;
    body: string | null;
};

interface FileMakerLoginResponse {
    response: {
        token: string;
    };
};

interface FileMakerFindResponse {
    response: {
        data: {
            fieldData: {
                "hours planned": number;
                "hours actual": number;
                "hours remaining": number;
            };
        }[];
    };
};

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

server.registerTool(
    "get_resource_plan",
    {
        title: "Get User Resource Plan",
        description: "Fetches the weekly resource plan for a user.",
        inputSchema: {
            user_name: z.string().describe("The name of the user to lookup."),
            date_range: z.string().describe("The week to get the plan for (e.g. 'this week')."),
        },
    },

    // Implementation Handler
    async ({ user_name, date_range }) => {
        let sessionToken: string | null = null;
        const FM_HOST = process.env.FM_HOST;
        const FM_DB = process.env.FM_DB;
        const FM_USER = process.env.FM_USER;
        const FM_PASS = process.env.FM_PASS;
        const FM_LAYOUT = process.env.FM_LAYOUT;
        
        const apiLogInUrl = `https://${FM_HOST}/fmi/data/vLatest/databases/${FM_DB}/sessions`;
        const apiPerformFindUrl = `https://${FM_HOST}/fmi/data/vLatest/databases/${FM_DB}/layouts/${FM_LAYOUT}/_find`;

        try {
            // 1. Check if credentials are provided
            if (!FM_USER || !FM_PASS) {
                throw new Error("FileMakaer username or password not set in the .env file.");
            }

            // 2. Create and encode credentials for Basic auth
            const credentials = `${FM_USER}:${FM_PASS}`;
            const encodedCredentials = Buffer.from(credentials).toString('base64');

            // 3. Make the login request
            const loginResponse = await fetch(apiLogInUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${encodedCredentials}`,
                },
                body: JSON.stringify({}) // FileMaker requires an empty JSON object in the body
            });

            if (!loginResponse.ok) {
                throw new Error(`FileMaker login failed with status ${loginResponse.status}`);
            }

            // Parse the JSON from the response
            const loginData = await loginResponse.json() as FileMakerLoginResponse;
            
            // Extract the token and store it
            sessionToken = loginData.response.token;

            console.error(`Successfully logged in. Session token: ${sessionToken}`);

            // 4. Make Find Request
            const findBody = {
                    "query": [
                        {"resource plan item__PARTY_employee::display name": `=${user_name}`}
                    ]
            };

            console.error('Sending FileMaker Find Request Body:', JSON.stringify(findBody, null, 2));
            
            const findResponse = await fetch(apiPerformFindUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sessionToken}`,
                },
                body: JSON.stringify(findBody)
            });

            if (!findResponse.ok) {
                throw new Error(`FileMaker perform find failed with status ${findResponse.status}`);
            }

            const findData = await findResponse.json() as FileMakerFindResponse;

            console.error('Received FileMaker Find Response:', JSON.stringify(findData, null, 2));

            const records = findData.response.data;

            if (!records || records.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: `No resource plan found for ${user_name} for ${date_range}`
                    }],
                };
            }

            const formattedPlan = records.map(record => {
                const hoursPlanned = record.fieldData["hours planned"] || 0;
                const hoursActual = record.fieldData["hours actual"] || 0;
                const hoursRemaining = record.fieldData["hours remaining"] || 0;
                return `Planned: ${hoursPlanned}\nActual: ${hoursActual}\nRemaining: ${hoursRemaining}`;
            }).join('\n');

            return {
                content: [{
                    type: "text",
                    text: `Successfully logged into FileMaker! Session Token: ${sessionToken}\n\nResource plan for ${user_name} for ${date_range}:\n\n${formattedPlan}`,
                }],
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error ocurred.";
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Error: ${errorMessage}`
                }],
            };
        } finally {
            // Log Out of theSession
            const logoutResponse = await fetch(`${apiLogInUrl}/${sessionToken}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}) // FileMaker requires an empty JSON object in the body
            });

            if (!logoutResponse.ok) {
                throw new Error(`FileMaker logout failed with status ${logoutResponse.status}`);
            }            
            console.error("FileMaker session terminated.");
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