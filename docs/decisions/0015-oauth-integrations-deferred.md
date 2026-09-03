# ADR 0015: Calendar sync and Social login deferred — no OAuth credentials to build against

**Status**: Accepted
**Date**: 2026-09-03

## Context

Blueprint §C's LATER list schedules "Google/Apple/Outlook Calendar sync" and "Social login (Google/Apple)" alongside the rest of Phase 10-12's work; the roadmap (§T) names Phase 11 "Integrations + Automation." Both features require a real OAuth application registered with the provider (a Google Cloud Console project with a Client ID/secret and configured consent screen, Apple's Sign in with Apple service configuration, Microsoft's Azure AD app registration for Outlook) before any code can be written against a real, testable flow. Blueprint §S's own risk list names this directly: "Third-party integrations (Phase 11) introduce OAuth/token-storage security surface not present anywhere else in the app — treated with the same rigor as Auth itself when that phase arrives, not bolted on casually" — building this blind, without real credentials to authenticate the flow against, would violate that stated rigor rather than honor it.

This development sandbox has no such credentials, and unlike Phase 10's AI provider keys (where the adapter code could be written correctly against a well-known, stable SDK even without a live key to test with), an OAuth authorization-code flow's correctness genuinely depends on redirect URI configuration, scope grants, and token refresh behavior specific to each provider — not something safely built and merely left untested.

## Decision

Calendar sync and Social login are not implemented this phase, not even scaffolded with a placeholder `oauth_connections` table. Building a schema before knowing the real token/scope shape each provider actually returns risks locking in a wrong shape that then needs a migration to fix, which is worse than not having the table yet. Magic Link auth — the third LATER-list auth item — ships for real this phase (ADR-worthy distinction: it needs no third-party credentials at all, only Supabase Auth's own built-in `signInWithOtp`, the same mechanism `requestPasswordReset` already uses).

## Consequences

- Settings' "AI Provider"-adjacent groups (Working Hours, Notification Preferences, Privacy, Data Export, Archived Content) remain placeholders as before; Calendar sync and Social login aren't even listed as upcoming placeholders in Settings, since neither has a natural home there yet without knowing the real connection-management UI shape.
- The moment real Client ID/secret credentials are available for any of these providers, that specific integration becomes buildable — this ADR is not a statement that they're hard, only that they're unbuildable-for-real without provider-issued credentials a sandbox can't self-generate.
- `notifications` and `automations` (this phase's real deliverables) were deliberately designed with no dependency on OAuth/external accounts, so neither blocks on this deferral.
