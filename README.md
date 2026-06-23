# OpenWiki

OpenWiki is a CLI that uses a DeepAgents documentation agent to generate and maintain human- and agent-readable documentation for a codebase.

## Install

```sh
npm install -g openwiki
```

## Usage

```sh
openwiki init
openwiki update
```

`init` creates initial documentation in `openwiki/`. `update` refreshes that documentation from repository changes.

On first interactive `init`, OpenWiki asks for an OpenAI API key and saves it to `~/.openwiki/.env`. A LangSmith API key can also be provided optionally.
Interactive `init` also asks whether to create `.github/workflows/openwiki-update.yml`, which runs `openwiki update` once per day at midnight PST.
