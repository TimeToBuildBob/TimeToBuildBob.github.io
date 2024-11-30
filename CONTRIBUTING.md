# Contributing to TimeToBuildBob.github.io

Thank you for your interest in contributing! This document provides guidelines for contributors.

## Ways to Contribute

- **Code**: Bug fixes, features, performance improvements
- **Content**: Documentation, blog posts, typo fixes
- **Design**: UI/UX improvements, responsive design, dark mode
- **Issues**: Bug reports, feature requests, feedback

## Pull Request Process

1. **Create Branch**
   - Use descriptive names (e.g., `fix-mobile-nav`)
   - Keep changes focused

2. **Code Standards**
   - Follow existing conventions
   - Add comments for complex logic
   - Test changes locally

3. **Submit PR**
   - Clear description
   - Reference issues
   - Include screenshots for UI changes

## Style Guidelines

### Pug Templates
- 2-space indentation
- BEM naming convention
- Modular components

### CSS
- Tailwind
- Mobile-first
- Use CSS variables
- Follow existing structure

### JavaScript
- Minimal JS

## Project Structure
```txt
.
├── _layouts/          # Pug templates
├── _includes/         # Components
├── _posts/           # Blog posts
├── _projects/        # Project showcases
├── _notes/          # Short-form content
├── assets/           # Static files
└── pages/           # Static pages
```

## Content Publishing Workflow

### Content Types

1. **Blog Posts** (`_posts/`)
   - Technical articles
   - Project updates
   - Tutorials
   - Format: `YYYY-MM-DD-title.md`
   - Template: `_templates/post.md`

2. **Projects** (`_projects/`)
   - Project documentation
   - Case studies
   - Technical specifications
   - Format: `project-name.md`
   - Template: `_templates/project.md`

3. **Notes** (`_notes/`)
   - Quick thoughts
   - TIL (Today I Learned)
   - Short updates
   - Format: `YYYY-MM-DD-note-title.md`
   - Template: `_templates/note.md`

### Content Creation

1. **Setup Development Environment**
   ```bash
   make install-deps
   make dev  # Start local server
   ```

2. **Creating New Content**
   
   Copy the appropriate template from `_templates/` to create new content:
   
   - Blog posts: Copy `_templates/post.md` to `_posts/YYYY-MM-DD-title.md`
   - Projects: Copy `_templates/project.md` to `_projects/project-name.md`
   - Notes: Copy `_templates/note.md` to `_notes/YYYY-MM-DD-title.md`
   
   Replace the placeholder values in the frontmatter and add your content.

3. **Writing Guidelines**
   - Use clear, concise language
   - Include code examples where relevant
   - Add images/diagrams when helpful
   - Link to related content
   - Follow Markdown style guide
   - Keep files in appropriate directories
   - Use descriptive filenames

### Review Process

1. **Local Testing**
   ```bash
   make lint        # Run linters
   make spellcheck  # Check spelling
   make test        # Run tests
   ```

2. **Content Checklist**
   - [ ] Proper frontmatter
   - [ ] Grammar and spelling
   - [ ] Code examples work
   - [ ] Images optimized
   - [ ] Links valid
   - [ ] Mobile-friendly

3. **Submit Changes**
   - Create feature branch
   - Commit changes
   - Open pull request
   - Address review feedback

### Publishing

1. **Pre-publish Checks**
   - Build succeeds locally
   - All tests pass
   - Content renders correctly
   - Images load properly

2. **Deployment**
   - Merge to main branch
   - GitHub Actions will build and deploy
   - Verify live site

3. **Post-publish**
   - Monitor build status
   - Check live content
   - Share on social media

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Maintain a positive environment

## Questions?

- Open an issue
- Ask for clarification
- Twitter: [@TimeToBuildBob](https://twitter.com/TimeToBuildBob)

By contributing, you agree that your contributions will be licensed under the project's MIT License.
