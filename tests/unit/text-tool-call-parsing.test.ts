import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { openaiToClaudeResponse } from "../../open-sse/translator/response/openai-to-claude.ts";

interface XmlToolCall {
  id: string;
  name: string;
  args: Record<string, string>;
}

interface TestState {
  toolCalls: Map<number, unknown>;
  nextBlockIndex: number;
  _pendingXmlToolCalls: XmlToolCall[];
}

describe("Text Tool Call Parsing Fixes", () => {
  it("parses <tool_call> JSON blocks in content text", () => {
    const chunk = {
      choices: [
        {
          delta: {
            content: '<tool_call>{"name":"Write","arguments":{"file_path":"/tmp/test.txt","content":"hello"}}</tool_call>',
          },
          finish_reason: "stop",
        },
      ],
    };
    const state: TestState = { toolCalls: new Map(), nextBlockIndex: 0, _pendingXmlToolCalls: [] };
    openaiToClaudeResponse(
      chunk as unknown as Parameters<typeof openaiToClaudeResponse>[0],
      state as unknown as Parameters<typeof openaiToClaudeResponse>[1]
    );
    assert.equal(state._pendingXmlToolCalls.length, 1);
    assert.equal(state._pendingXmlToolCalls[0].name, "Write");
    assert.equal(state._pendingXmlToolCalls[0].args.file_path, "/tmp/test.txt");
  });

  it("parses TOOL_CALL Name: JSON blocks in content text", () => {
    const chunk = {
      choices: [
        {
          delta: {
            content: 'TOOL_CALL Read: {"file_path":"/home/ubuntu/codeatlas-mcp-server/SECURITY.md"}',
          },
          finish_reason: "stop",
        },
      ],
    };
    const state: TestState = { toolCalls: new Map(), nextBlockIndex: 0, _pendingXmlToolCalls: [] };
    openaiToClaudeResponse(
      chunk as unknown as Parameters<typeof openaiToClaudeResponse>[0],
      state as unknown as Parameters<typeof openaiToClaudeResponse>[1]
    );
    assert.equal(state._pendingXmlToolCalls.length, 1);
    assert.equal(state._pendingXmlToolCalls[0].name, "Read");
    assert.equal(state._pendingXmlToolCalls[0].args.file_path, "/home/ubuntu/codeatlas-mcp-server/SECURITY.md");
  });

  it("parses standard XML <invoke> blocks in content text", () => {
    const chunk = {
      choices: [
        {
          delta: {
            content: '<invoke name="Bash"><parameter name="command">ls -la</parameter></invoke>',
          },
          finish_reason: "stop",
        },
      ],
    };
    const state: TestState = { toolCalls: new Map(), nextBlockIndex: 0, _pendingXmlToolCalls: [] };
    openaiToClaudeResponse(
      chunk as unknown as Parameters<typeof openaiToClaudeResponse>[0],
      state as unknown as Parameters<typeof openaiToClaudeResponse>[1]
    );
    assert.equal(state._pendingXmlToolCalls.length, 1);
    assert.equal(state._pendingXmlToolCalls[0].name, "Bash");
    assert.equal(state._pendingXmlToolCalls[0].args.command, "ls -la");
  });
});
