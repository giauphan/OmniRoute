import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { geminiToClaudeResponse } from "../../open-sse/translator/response/gemini-to-claude.ts";
import { openaiToClaudeResponse } from "../../open-sse/translator/response/openai-to-claude.ts";
import { restoreClaudeToolName } from "../../open-sse/services/claudeCodeToolRemapper.ts";
import { restoreClaudePassthroughToolUseName } from "../../open-sse/utils/stream.ts";

describe("Claude Code Tool Name Casing Fixes", () => {
  it("restoreClaudeToolName maps lowercase tool names to PascalCase", () => {
    assert.equal(restoreClaudeToolName("bash"), "Bash");
    assert.equal(restoreClaudeToolName("read"), "Read");
    assert.equal(restoreClaudeToolName("write"), "Write");
    assert.equal(restoreClaudeToolName("websearch"), "WebSearch");
    assert.equal(restoreClaudeToolName("webfetch"), "WebFetch");
    assert.equal(restoreClaudeToolName("agent"), "Agent");
    assert.equal(restoreClaudeToolName("unknown"), "unknown"); // No mapping
  });

  it("restoreClaudeToolName respects toolNameMap when provided", () => {
    const toolNameMap = new Map([
      ["custom_read", "CustomRead"],
      ["custom_bash", "CustomBash"]
    ]);
    assert.equal(restoreClaudeToolName("custom_read", toolNameMap), "CustomRead");
    assert.equal(restoreClaudeToolName("custom_bash", toolNameMap), "CustomBash");
    assert.equal(restoreClaudeToolName("read", toolNameMap), "Read"); // Fallback to TOOL_CASE_MAP
  });

  it("geminiToClaudeResponse normalizes lowercase tool names to PascalCase", () => {
    const chunk = {
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "read",
                  args: { file_path: "/home/ubuntu/test.txt" },
                },
              },
            ],
          },
        },
      ],
    };
    const state: any = { messageId: null, model: "gemini" };
    const events = geminiToClaudeResponse(chunk, state);
    const startEvent = events?.find((e: any) => e.type === "content_block_start");
    assert.equal(startEvent?.content_block?.name, "Read");
  });

  it("openaiToClaudeResponse normalizes lowercase tool names to PascalCase", () => {
    const chunk = {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "call_123",
                function: {
                  name: "bash",
                  arguments: '{"command": "ls"}',
                },
              },
            ],
          },
        },
      ],
    };
    const state: any = { toolCalls: new Map(), nextBlockIndex: 0 };
    const events = openaiToClaudeResponse(chunk, state);
    const startEvent = events?.find((e: any) => e.type === "content_block_start");
    assert.equal(startEvent?.content_block?.name, "Bash");
  });

  it("restoreClaudePassthroughToolUseName handles lowercase tool names without toolNameMap", () => {
    const parsed = {
      content_block: {
        type: "tool_use",
        id: "tool_123",
        name: "read",
      },
    };
    const restored = restoreClaudePassthroughToolUseName(parsed as any, null);
    assert.equal(restored, true);
    assert.equal(parsed.content_block.name, "Read");
  });

  it("restoreClaudePassthroughToolUseName respects toolNameMap when provided", () => {
    const parsed = {
      content_block: {
        type: "tool_use",
        id: "tool_123",
        name: "custom_tool",
      },
    };
    const toolNameMap = new Map([
      ["custom_tool", "CustomTool"]
    ]);
    const restored = restoreClaudePassthroughToolUseName(parsed as any, toolNameMap);
    assert.equal(restored, true);
    assert.equal(parsed.content_block.name, "CustomTool");
  });
});