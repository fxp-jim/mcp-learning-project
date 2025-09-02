# MCP GitHub Issue Viewer

This project is a command-line server and client built to learn the fundamentals of the **Model Context Protocol (MCP)** using Node.js and TypeScript. It was created following the MCP Coach guided tutorial.

The server connects to the public GitHub API to provide tools for inspecting repository issues, and the client provides an interactive command-line interface to use those tools.

## Features

-   **MCP Server (`src/index.ts`):**
    -   Exposes a `list_open_issues` tool to fetch the 5 most recent open issues for a repository.
    -   Exposes a `get_issue_details` tool to fetch the title, author, and body of a specific issue.
-   **MCP Client (`src/client.ts`):**
    -   Connects to the server using the `stdio` transport.
    -   Provides an interactive REPL (Read-Evaluate-Print Loop) to query different repositories and issues.

## Technology Stack

-   [Node.js](https://nodejs.org/)
-   [TypeScript](https://www.typescriptlang.org/)
-   [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
-   [Zod](https://zod.dev/) for schema validation

## Setup and Usage

**1. Clone the repository:**
```bash
git clone [https://github.com/fxp-jim/mcp-learning-project.git](https://github.com/fxp-jim/mcp-learning-project.git)
cd mcp-learning-project
```

**2. Install dependencies:**
```bash
npm install
```

**3. Compile the code:**
```bash
npm run build
```

**4. Run the interactive client:**
The client will automatically start the server in the background.
```bash
node build/client.js build/index.js
```
Now follow the prompts in the terminal to interact with the application!