import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer(
  {
    name: "hello-world-app",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "say_hello",
  {
    description: "Say Hello",
  },
  {
    description: "Greet the user with a friendly hello world message.",
    inputSchema: {
      name: z.string().describe("The name of the person to greet."),
    },
  },
  async ({ name }) => {
    return {
      structuredContent: { greeting: `Hello, ${name}! Welcome to Skybridge.` },
      content: [],
      isError: false,
    };
  },
);

server.run();

export type AppType = typeof server;
