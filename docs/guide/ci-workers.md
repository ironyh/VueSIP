# Cloudflare Workers CI Guidance

The repository integrates with Cloudflare Workers for two services:

- `vuesip` (wrangler.toml): serves the built docs (`docs/.vitepress/dist`).
- `vuesiplay` (wrangler.playground.toml): serves the built playground (`dist-playground`).

These services may be connected via the Cloudflare GitHub App to auto-build on PRs. When enabled, builds can fail on PR branches due to missing environment/secrets or branch policies. Our GitHub Actions already deploy on `main` and do not require CF-side auto-build on PRs.

Recommended settings (Cloudflare dashboard → Workers & Pages → GitHub Integration):

- Disable auto builds for PR branches, or scope builds to `main` only.
- Keep GitHub Actions as the primary deploy path (`cloudflare/wrangler-action`) for controlled builds.

Troubleshooting:

- If you see checks named “Workers Builds: vuesip” or “Workers Builds: vuesiplay” failing on PRs, it’s usually the CF-side build—not our GH workflow. You can mark those checks as non-required for PRs, or disable PR builds in the CF integration.
