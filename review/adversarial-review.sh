#!/usr/bin/env bash

if [ "$#" -eq 0 ]; then
  printf 'Usage: %s <review request>\n' "$0" >&2
  exit 2
fi

pi -p --model openai-codex/gpt-5.6-terra --thinking high --no-session --no-tools --system-prompt "$(<review/adversarial-reviewer.md)" -- "$*"
