import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { openWikiEnvPath, saveOpenWikiEnv } from "./env.js";
import {
  openWikiWorkflowPath,
  writeOpenWikiUpdateWorkflow,
  type WorkflowWriteStatus,
} from "./github-action.js";

export type WorkflowSetupStatus = WorkflowWriteStatus | "skipped";

export type InitSetupResult = {
  savedOpenAIKey: boolean;
  savedLangSmithKey: boolean;
  workflow: {
    path: string;
    status: WorkflowSetupStatus;
  };
};

type InitSetupProps = {
  onComplete: (result: InitSetupResult) => void;
  onError: (message: string) => void;
};

type PromptStep = "openai" | "langsmith" | "workflow";

export function needsCredentialSetup(): boolean {
  return (
    !process.env.OPENAI_API_KEY || process.env.LANGSMITH_API_KEY === undefined
  );
}

export function InitSetup({ onComplete, onError }: InitSetupProps) {
  const [step, setStep] = useState<PromptStep>(getInitialStep);
  const [openAIKey, setOpenAIKey] = useState<string | null>(null);
  const [langSmithKey, setLangSmithKey] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useInput((inputValue, key) => {
    if (isSaving) {
      return;
    }

    if (key.return) {
      void submit();
      return;
    }

    if (key.backspace || key.delete) {
      setInput((value) => value.slice(0, -1));
      return;
    }

    if (inputValue && !key.ctrl && !key.meta) {
      setInput((value) => value + inputValue);
    }
  });

  async function submit() {
    setError(null);

    if (step === "openai") {
      const trimmedInput = input.trim();

      if (trimmedInput.length === 0) {
        setError("OpenAI API key is required.");
        return;
      }

      setOpenAIKey(trimmedInput);
      setInput("");
      setStep(
        process.env.LANGSMITH_API_KEY === undefined ? "langsmith" : "workflow",
      );
      return;
    }

    if (step === "langsmith") {
      setLangSmithKey(input.trim());
      setInput("");
      setStep("workflow");
      return;
    }

    const shouldCreateWorkflow = parseWorkflowAnswer(input);

    if (shouldCreateWorkflow === null) {
      setError("Enter yes or no.");
      return;
    }

    setIsSaving(true);

    try {
      const updates: Record<string, string> = {};

      if (openAIKey !== null) {
        updates.OPENAI_API_KEY = openAIKey;
      }

      if (langSmithKey !== null && langSmithKey.length > 0) {
        updates.LANGSMITH_API_KEY = langSmithKey;
        updates.LANGCHAIN_PROJECT = "openwiki";
        updates.LANGCHAIN_TRACING_V2 = "true";
      }

      if (Object.keys(updates).length > 0) {
        await saveOpenWikiEnv(updates);
      }

      const workflow = shouldCreateWorkflow
        ? await writeOpenWikiUpdateWorkflow()
        : {
            path: openWikiWorkflowPath,
            status: "skipped" as const,
          };

      onComplete({
        savedOpenAIKey: openAIKey !== null,
        savedLangSmithKey: langSmithKey !== null && langSmithKey.length > 0,
        workflow,
      });
    } catch (saveError) {
      onError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to complete OpenWiki init setup.",
      );
    }
  }

  const needsCredentialPrompt = needsCredentialSetup();

  return (
    <Box flexDirection="column">
      <Text>OpenWiki init setup</Text>
      {needsCredentialPrompt ? (
        <Text>Credentials will be saved to {openWikiEnvPath}</Text>
      ) : null}
      <Text>GitHub Action path: {openWikiWorkflowPath}</Text>
      <Box marginTop={1}>
        <Prompt step={step} input={input} />
      </Box>
      {error ? (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      ) : null}
      {isSaving ? (
        <Box marginTop={1}>
          <Text>Saving OpenWiki setup...</Text>
        </Box>
      ) : null}
    </Box>
  );
}

type PromptProps = {
  step: PromptStep;
  input: string;
};

function Prompt({ step, input }: PromptProps) {
  if (step === "openai") {
    return <Text>OpenAI API key: {mask(input)}</Text>;
  }

  if (step === "langsmith") {
    return (
      <Text>
        LangSmith API key (optional, press Enter to skip): {mask(input)}
      </Text>
    );
  }

  return (
    <Text>
      Create update GitHub Action at {openWikiWorkflowPath}? [Y/n]: {input}
    </Text>
  );
}

function getInitialStep(): PromptStep {
  if (!process.env.OPENAI_API_KEY) {
    return "openai";
  }

  if (process.env.LANGSMITH_API_KEY === undefined) {
    return "langsmith";
  }

  return "workflow";
}

function parseWorkflowAnswer(value: string): boolean | null {
  const answer = value.trim().toLowerCase();

  if (answer.length === 0 || answer === "y" || answer === "yes") {
    return true;
  }

  if (answer === "n" || answer === "no") {
    return false;
  }

  return null;
}

function mask(value: string): string {
  if (value.length === 0) {
    return "";
  }

  return "*".repeat(value.length);
}
