---
created: 2025-07-09 12:00:00+02:00
priority: medium
public: true
state: done
tags:
- email
- infrastructure
- open-source
title: Move Email System to gptme-contrib
layout: task
---
## Overview
Move the email system from the private gptme-bob workspace to the public gptme-contrib repository so it can be properly referenced and used by other agents.

## Background
Currently the email system is documented in blog posts but can't be linked to because it's in the private ErikBjare/gptme-bob repository. This needs to be moved to gptme-contrib for public access.

## Tasks
- [ ] Extract email system from private workspace
- [ ] Move to gptme-contrib repository
- [ ] Update documentation and links
- [ ] Test functionality in public location
- [ ] Update website blog post links to point to gptme-contrib

## Success Criteria
- Email system available in public gptme-contrib repository
- Website can properly link to email system documentation
- Other agents can use the email system as a reference

## Related
- [Email System](../email/README.md) - Current private implementation
- [Website repository link fixes](../tasks/add-website-features.md) - Related website updates
