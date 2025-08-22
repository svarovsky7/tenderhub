#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Validate environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tool schemas
const QuerySchema = z.object({
  table: z.string().describe('The name of the table to query'),
  select: z.string().optional().describe('Columns to select (default: *)'),
  filter: z.record(z.any()).optional().describe('Filter conditions as key-value pairs'),
  limit: z.number().optional().describe('Maximum number of rows to return'),
  orderBy: z.string().optional().describe('Column to order by'),
  ascending: z.boolean().optional().describe('Sort order (true for ascending, false for descending)')
});

const InsertSchema = z.object({
  table: z.string().describe('The name of the table to insert into'),
  data: z.union([
    z.record(z.any()),
    z.array(z.record(z.any()))
  ]).describe('Data to insert (single object or array of objects)')
});

const UpdateSchema = z.object({
  table: z.string().describe('The name of the table to update'),
  data: z.record(z.any()).describe('Data to update'),
  filter: z.record(z.any()).describe('Filter conditions to identify rows to update')
});

const DeleteSchema = z.object({
  table: z.string().describe('The name of the table to delete from'),
  filter: z.record(z.any()).describe('Filter conditions to identify rows to delete')
});

const RpcSchema = z.object({
  functionName: z.string().describe('The name of the database function to call'),
  params: z.record(z.any()).optional().describe('Parameters to pass to the function')
});

// Create MCP server
const server = new Server(
  {
    name: 'mcp-supabase-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'supabase_query',
    description: 'Query data from a Supabase table with optional filtering and sorting',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'The name of the table to query' },
        select: { type: 'string', description: 'Columns to select (default: *)' },
        filter: { type: 'object', description: 'Filter conditions as key-value pairs' },
        limit: { type: 'number', description: 'Maximum number of rows to return' },
        orderBy: { type: 'string', description: 'Column to order by' },
        ascending: { type: 'boolean', description: 'Sort order (true for ascending, false for descending)' }
      },
      required: ['table']
    }
  },
  {
    name: 'supabase_insert',
    description: 'Insert data into a Supabase table',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'The name of the table to insert into' },
        data: { 
          oneOf: [
            { type: 'object', description: 'Single record to insert' },
            { type: 'array', items: { type: 'object' }, description: 'Multiple records to insert' }
          ]
        }
      },
      required: ['table', 'data']
    }
  },
  {
    name: 'supabase_update',
    description: 'Update data in a Supabase table',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'The name of the table to update' },
        data: { type: 'object', description: 'Data to update' },
        filter: { type: 'object', description: 'Filter conditions to identify rows to update' }
      },
      required: ['table', 'data', 'filter']
    }
  },
  {
    name: 'supabase_delete',
    description: 'Delete data from a Supabase table',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'The name of the table to delete from' },
        filter: { type: 'object', description: 'Filter conditions to identify rows to delete' }
      },
      required: ['table', 'filter']
    }
  },
  {
    name: 'supabase_rpc',
    description: 'Call a Supabase database function (RPC)',
    inputSchema: {
      type: 'object',
      properties: {
        functionName: { type: 'string', description: 'The name of the database function to call' },
        params: { type: 'object', description: 'Parameters to pass to the function' }
      },
      required: ['functionName']
    }
  },
  {
    name: 'supabase_schema',
    description: 'Get information about database tables and their schemas',
    inputSchema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Optional: specific table name to get schema for' }
      }
    }
  }
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'supabase_query': {
        const params = QuerySchema.parse(args);
        let query = supabase.from(params.table).select(params.select || '*');
        
        // Apply filters
        if (params.filter) {
          Object.entries(params.filter).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle complex filters like { gt: 10 }
              Object.entries(value).forEach(([operator, operand]) => {
                query = query.filter(key, operator, operand);
              });
            } else {
              query = query.eq(key, value);
            }
          });
        }
        
        // Apply ordering
        if (params.orderBy) {
          query = query.order(params.orderBy, { ascending: params.ascending ?? true });
        }
        
        // Apply limit
        if (params.limit) {
          query = query.limit(params.limit);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
      
      case 'supabase_insert': {
        const params = InsertSchema.parse(args);
        const { data, error } = await supabase
          .from(params.table)
          .insert(params.data)
          .select();
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data }, null, 2)
            }
          ]
        };
      }
      
      case 'supabase_update': {
        const params = UpdateSchema.parse(args);
        let query = supabase.from(params.table).update(params.data);
        
        // Apply filters
        Object.entries(params.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const { data, error } = await query.select();
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data }, null, 2)
            }
          ]
        };
      }
      
      case 'supabase_delete': {
        const params = DeleteSchema.parse(args);
        let query = supabase.from(params.table).delete();
        
        // Apply filters
        Object.entries(params.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const { data, error } = await query.select();
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: data }, null, 2)
            }
          ]
        };
      }
      
      case 'supabase_rpc': {
        const params = RpcSchema.parse(args);
        const { data, error } = await supabase.rpc(params.functionName, params.params || {});
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
      
      case 'supabase_schema': {
        const table = args?.table as string | undefined;
        
        // Query information schema for table structure
        const query = table
          ? `SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = '${table}'
            ORDER BY ordinal_position;`
          : `SELECT 
              table_name,
              table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;`;
        
        const { data, error } = await supabase.rpc('query_schema', { query_text: query }).select();
        
        if (error) {
          // Fallback to listing tables if RPC doesn't exist
          if (table) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Schema query not available. Use supabase_query to explore table structure.'
                }
              ]
            };
          } else {
            // Try to get table list through a simple query
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message: 'Available tables in the project',
                    tables: [
                      'boq_items',
                      'client_positions',
                      'cost_categories',
                      'detail_cost_categories',
                      'location',
                      'materials_library',
                      'tenders',
                      'units',
                      'work_material_links',
                      'works_library'
                    ]
                  }, null, 2)
                }
              ]
            };
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Supabase Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});