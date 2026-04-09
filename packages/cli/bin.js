#!/bin/sh
':' //; launcher="$(command -v node 2>/dev/null || command -v bun 2>/dev/null)"; [ -n "$launcher" ] || { echo "Error: tokscale requires Node.js or Bun in PATH" >&2; exit 127; }; exec "$launcher" "$0" "$@"

await import("./dist/index.js");
