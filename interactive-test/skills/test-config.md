---
name: test-config
description: Validate the pi-outpost configuration file for correctness.
---

# Validate Configuration

Check the pi-outpost configuration file for common mistakes.

## Steps

1. Verify `sandbox.root` exists and is accessible.
2. Confirm `agentDir` points to a writable directory.
3. Check that `extensionPaths` reference existing files.
4. Ensure `cwd` is set to a valid project directory.
5. Validate the port is not already in use.
