import { initChatModel } from "langchain/chat_models/universal";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { loadOpenWikiEnv } from "../env.js";
import { createSystemPrompt, createUserPrompt } from "./prompt.js";
import type { OpenWikiCommand, OpenWikiRunResult } from "./types.js";
import { MODEL_NAME } from "../constants.js";
import { createRunContext, writeLastUpdateMetadata } from "./utils.js";

export async function runOpenWikiAgent(
  command: OpenWikiCommand,
  cwd = process.cwd(),
): Promise<OpenWikiRunResult> {
  await loadOpenWikiEnv();
  ensureOpenAIKey();

  const context = await createRunContext(command, cwd);
  const model = await createModel();
  const agent = createDeepAgent({
    model,
    tools: [],
    backend: new FilesystemBackend({
      rootDir: cwd,
      virtualMode: true,
    }),
    systemPrompt: createSystemPrompt(command),
  });

  await agent.invoke({
    messages: [
      {
        role: "user",
        content: createUserPrompt(command, context),
      },
    ],
  });

  await writeLastUpdateMetadata(command, cwd);

  return {
    command,
    model: MODEL_NAME,
  };
}

function ensureOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to run the OpenWiki agent.");
  }
}

async function createModel() {
  return initChatModel(MODEL_NAME, {
    modelProvider: "openai",
    reasoning: {
      effort: "medium",
    },
  });
}
