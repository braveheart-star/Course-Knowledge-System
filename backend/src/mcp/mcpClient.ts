import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import fs from 'fs';

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

class MCPClientManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnecting = false;
  private isConnected = false;
  private connectionPromise: Promise<Client> | null = null;

  async connect(): Promise<Client> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this._connect();

    try {
      const client = await this.connectionPromise;
      return client;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async _connect(): Promise<Client> {
    try {
      // Get the path to the MCP server script
      const serverPath = path.resolve(__dirname, 'server.ts');

      // Create MCP client
      this.client = new Client(
        {
          name: 'course-knowledge-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // On Windows, use cmd.exe to run npx (handles .cmd files correctly)
      // On Unix, use npx directly
      let tsxCommand: string;
      let tsxArgs: string[];
      
      if (process.platform === 'win32') {
        // Windows: use cmd.exe /c to run npx
        tsxCommand = process.env.COMSPEC || 'cmd.exe';
        tsxArgs = ['/c', 'npx', 'tsx', serverPath];
      } else {
        // Unix-like: use npx directly
        tsxCommand = 'npx';
        tsxArgs = ['tsx', serverPath];
      }

      // Create stdio transport - this will spawn the server process
      this.transport = new StdioClientTransport({
        command: tsxCommand,
        args: tsxArgs,
        env: process.env,
      });

      // Connect client to server via stdio
      await this.client.connect(this.transport);
      this.isConnected = true;

      console.log('✓ MCP Client connected to MCP Server');

      return this.client;
    } catch (error: any) {
      this.isConnected = false;
      console.error('Failed to connect MCP client:', error);
      throw new Error(`MCP Client connection failed: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('Error closing MCP client:', error);
      }
      this.client = null;
      this.isConnected = false;
    }

    if (this.transport) {
      try {
        // The transport will handle cleanup of the spawned process
        this.transport = null;
      } catch (error) {
        console.error('Error closing transport:', error);
      }
    }
  }

  async callTool(name: string, args: Record<string, any>): Promise<MCPToolResult> {
    try {
      const client = await this.connect();

      const result = await client.callTool({
        name,
        arguments: args,
      });

      if (result.content && result.content.length > 0) {
        return {
          content: result.content.map((item: any) => ({
            type: item.type || 'text',
            text: typeof item.text === 'string' ? item.text : JSON.stringify(item.text),
          })),
          isError: result.isError || false,
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false,
      };
    } catch (error: any) {
      console.error(`Error calling MCP tool ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error.message || 'An error occurred calling MCP tool',
            }),
          },
        ],
        isError: true,
      };
    }
  }

  async listTools() {
    try {
      const client = await this.connect();
      const result = await client.listTools();
      return result.tools || [];
    } catch (error: any) {
      console.error('Error listing MCP tools:', error);
      return [];
    }
  }
}

// Singleton instance
let mcpClientManager: MCPClientManager | null = null;

export function getMCPClient(): MCPClientManager {
  if (!mcpClientManager) {
    mcpClientManager = new MCPClientManager();
  }
  return mcpClientManager;
}

export async function callMCPTool(
  toolName: string,
  args: Record<string, any>
): Promise<MCPToolResult> {
  const client = getMCPClient();
  return client.callTool(toolName, args);
}

export async function listMCPTools() {
  const client = getMCPClient();
  return client.listTools();
}

// Cleanup on process exit
process.on('SIGINT', async () => {
  if (mcpClientManager) {
    await mcpClientManager.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (mcpClientManager) {
    await mcpClientManager.disconnect();
  }
  process.exit(0);
});

