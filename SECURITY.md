# Security policy

## Reporting a vulnerability

Please open a private GitHub security advisory rather than a public issue. Include the affected version, reproduction steps, and impact.

## Local security model

EduPilot intentionally has no authentication. Run it on a trusted machine and keep both Django and Ollama bound to trusted interfaces. Do not expose the backend to the public internet without adding access control, TLS, rate limits, and request-size controls appropriate to that deployment.

## Previously committed credentials

Removing a credential from the current branch does not revoke it. Maintainers of repositories derived from the earlier hosted version must rotate/revoke every exposed OpenAI, Firebase/service-account, Stripe, and Django secret, then purge the affected files from all Git refs and force-push the rewritten refs. Existing forks and clones may retain old objects and must be treated as compromised copies.
