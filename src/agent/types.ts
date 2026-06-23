export type OpenWikiCommand = "init" | "update";

export type OpenWikiRunResult = {
  command: OpenWikiCommand;
  model: string;
};

export type UpdateMetadata = {
  updatedAt: string;
  command: OpenWikiCommand;
  model: string;
};

export type RunContext = {
  lastUpdate: UpdateMetadata | null;
  gitSummary: string;
};
