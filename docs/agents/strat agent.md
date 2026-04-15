---
name: product-strategy-auditor
description: A skill that evaluates codebases for product viability and feature prioritization. Use this when you need to "analyze feature ROI", "decide what to build next", "identify features to kill", or "audit product strategy".
version: "1.0.0"
category: Workflow
---

## Overview

The product-strategy-auditor analyzes the current codebase to identify technical debt, feature complexity, and architectural bottlenecks. It provides objective recommendations on whether to continue investing in specific modules, pivot to new features, or deprecate low-value code paths to reduce maintenance overhead.

## How It Works

1. The skill scans the project directory to map out existing features and their implementation complexity.
2. It evaluates the ratio of boilerplate to core business logic across different modules.
3. It identifies "dead" or rarely touched code that adds cognitive load without delivering proportional value.
4. It generates a strategic report categorizing features into "Build" (high potential), "Maintain" (stable value), or "Kill" (high cost/low value).

## When to Use This Skill

- When a project feels bloated and development velocity is slowing down.
- Before starting a new sprint to ensure resources are allocated to the highest-impact tasks.
- When deciding whether to refactor a legacy module or replace it entirely.
- During a product pivot to identify which existing assets are reusable.

## Examples

### Example 1: Feature ROI Audit

**User:** Analyze our current dashboard features and tell me what to build next and what to kill.

**Assistant:**
1. Scanned `src/components/dashboard` and `src/api/reports`.
2. Identified that the "Advanced Export" feature accounts for 40% of the dashboard code but has no recent updates or tests.
3. Identified that the "Quick Stats" widget is lightweight and highly extensible.
4. Recommendation: Kill "Advanced Export" to reduce maintenance; Build "Real-time Alerts" as an extension of the "Quick Stats" logic.

### Example 2: Pivot Analysis

**User:** We are shifting from B2C to B2B. Audit the codebase for product strategy.

**Assistant:**
1. Evaluated `src/auth` and `src/billing` modules.
2. Found the social login integration is tightly coupled with the user profile logic.
3. Recommendation: Kill the social login features to simplify the security posture for enterprise clients.
4. Recommendation: Build a "Teams" abstraction layer over the current "User" model to support B2B hierarchy.

## Best Practices

- Provide the skill with access to `package.json` or `requirements.txt` to see external dependencies.
- Use the skill in conjunction with git history to see which features are most frequently modified.
- Be prepared for "hard questions" regarding technical debt that may be masking poor product market fit.

## Integration

The skill works by combining file system analysis with architectural pattern recognition. It integrates with grep to find feature flags and git to analyze change frequency.

## Common Pitfalls

- The skill focuses on technical implementation and code structure; it should be supplemented with actual user analytics data if available.
- Killing code too aggressively without checking for hidden dependencies in non-standard file locations.
