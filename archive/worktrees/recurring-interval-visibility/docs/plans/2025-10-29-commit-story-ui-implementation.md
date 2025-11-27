# Commit Story UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a co-founder recruitment tool that translates git commits into business-meaningful stories for hull cleaner divers

**Architecture:** Server-side edge function fetches commits from GitHub API, translates via Gemini AI into pain point categories, caches in Vercel KV (1hr TTL), and serves to React page component organized by business problems

**Tech Stack:** React, Vite, Vercel Edge Functions, GitHub API, Gemini API, Vercel KV (Redis), Playwright for testing

**Working Directory:** `/Users/brian/app-development/sailorskills-repos/sailorskills-site/.worktrees/commit-story`

---

## Task 1: Set up environment variables and configuration

**Files:**
- Modify: `.env.example:53-60`
- Create: `.env.local` (not tracked)

**Step 1: Add new environment variables to .env.example**

```bash
# Add to .env.example after line 53
cat >> .env.example << 'EOF'

# GitHub API Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_ORG=standardhuman
GITHUB_REPO=sailorskills-repos

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
EOF
```

**Step 2: Create .env.local for local development**

Copy .env.example to .env.local and add real values:
```bash
cp .env.example .env.local
```

Then manually add your actual tokens (not shown in plan for security).

**Step 3: Commit configuration changes**

```bash
git add .env.example
git commit -m "[SETUP] Add GitHub and Gemini env vars for commit story"
```

---

## Task 2: Create Vercel Edge Function for commit story API

**Files:**
- Create: `api/commit-story.js`

**Step 1: Create basic edge function structure**

```javascript
// api/commit-story.js
export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  return new Response(
    JSON.stringify({ message: 'Commit story API' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
```

**Step 2: Test edge function locally**

Run: `vercel dev`
Navigate to: `http://localhost:3000/api/commit-story`
Expected: JSON response with "Commit story API" message

**Step 3: Commit basic structure**

```bash
git add api/commit-story.js
git commit -m "[FEATURE] Add commit-story edge function skeleton"
```

---

## Task 3: Implement GitHub API integration

**Files:**
- Modify: `api/commit-story.js:1-50`

**Step 1: Add GitHub API fetch logic**

```javascript
// api/commit-story.js
export const config = {
  runtime: 'edge',
};

const GITHUB_API_BASE = 'https://api.github.com';

async function fetchCommits(token, org, repo) {
  const url = `${GITHUB_API_BASE}/repos/${org}/${repo}/commits?per_page=100`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return await response.json();
}

function filterMilestoneCommits(commits) {
  const milestonePatterns = /^\[(FEATURE|FIX|PHASE|DOC)\]/;

  return commits
    .filter(commit => {
      const message = commit.commit.message;
      return milestonePatterns.test(message);
    })
    .map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author.date,
      author: commit.commit.author.name,
    }));
}

export default async function handler(request) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const org = process.env.GITHUB_ORG || 'standardhuman';
    const repo = process.env.GITHUB_REPO || 'sailorskills-repos';

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'GitHub token not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const commits = await fetchCommits(token, org, repo);
    const milestones = filterMilestoneCommits(commits);

    return new Response(
      JSON.stringify({ commits: milestones, count: milestones.length }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
```

**Step 2: Test GitHub integration**

Run: `vercel dev`
Navigate to: `http://localhost:3000/api/commit-story`
Expected: JSON with filtered milestone commits

**Step 3: Commit GitHub integration**

```bash
git add api/commit-story.js
git commit -m "[FEATURE] Add GitHub API integration and commit filtering"
```

---

## Task 4: Implement Gemini AI translation

**Files:**
- Modify: `api/commit-story.js:51-150`

**Step 1: Add Gemini translation function**

```javascript
// Add after filterMilestoneCommits function

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const TRANSLATION_PROMPT = `You are translating git commits for a marine service business management suite.
Target audience: Hull cleaner divers who run small marine service businesses.

Their daily pain points:
- Scheduling: Managing boat service appointments, tracking which boats need cleaning
- Billing: Creating invoices, tracking payments, handling customer accounts
- Inventory: Managing anode supplies, tracking installations on boats
- Communication: Keeping customers informed about service status
- Operations: Recording underwater work, propeller tracking, service history

For each commit below, identify:
1. Which pain point category it addresses (Scheduling, Billing, Inventory, Communication, Operations, or skip if internal)
2. A 1-2 sentence business translation: what problem this solves for hull cleaners

Return ONLY valid JSON array with this structure:
[
  {
    "category": "Operations",
    "business_impact": "Track propeller condition during underwater inspections.",
    "commit_sha": "abc123",
    "date": "2025-10-15"
  }
]

Skip commits that are purely internal (tests, CI/CD, refactoring) unless they directly impact user workflow.

Commits to translate:`;

async function translateCommitsWithGemini(commits, apiKey) {
  const commitsData = commits.map(c => ({
    sha: c.sha,
    message: c.message,
    date: c.date,
  }));

  const prompt = `${TRANSLATION_PROMPT}\n\n${JSON.stringify(commitsData, null, 2)}`;

  const url = `${GEMINI_API_BASE}/models/gemini-pro:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates[0]?.content?.parts[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);
  const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

  return JSON.parse(jsonText);
}

function categorizeTranslations(translations) {
  const categories = {
    Operations: [],
    Billing: [],
    Scheduling: [],
    Inventory: [],
    Communication: [],
  };

  translations.forEach(item => {
    if (categories[item.category]) {
      categories[item.category].push(item);
    }
  });

  return categories;
}
```

**Step 2: Update handler to use Gemini**

```javascript
// Replace the handler function's try block

export default async function handler(request) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const geminiKey = process.env.GEMINI_API_KEY;
    const org = process.env.GITHUB_ORG || 'standardhuman';
    const repo = process.env.GITHUB_REPO || 'sailorskills-repos';

    if (!githubToken || !geminiKey) {
      return new Response(
        JSON.stringify({ error: 'API keys not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch and filter commits
    const commits = await fetchCommits(githubToken, org, repo);
    const milestones = filterMilestoneCommits(commits);

    // Translate with Gemini
    const translations = await translateCommitsWithGemini(milestones, geminiKey);
    const categorized = categorizeTranslations(translations);

    return new Response(
      JSON.stringify({
        categories: categorized,
        lastUpdated: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    console.error('Commit story API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
```

**Step 3: Test Gemini translation**

Run: `vercel dev`
Navigate to: `http://localhost:3000/api/commit-story`
Expected: JSON with categorized, translated commits

**Step 4: Commit Gemini integration**

```bash
git add api/commit-story.js
git commit -m "[FEATURE] Add Gemini AI translation and categorization"
```

---

## Task 5: Create React page component for story UI

**Files:**
- Create: `src/pages/CommitStoryPage.tsx`

**Step 1: Create basic page component**

```typescript
// src/pages/CommitStoryPage.tsx
import React, { useState, useEffect } from 'react';
import '../App.css';

interface CommitStory {
  category: string;
  business_impact: string;
  commit_sha: string;
  date: string;
}

interface StoryData {
  categories: {
    Operations: CommitStory[];
    Billing: CommitStory[];
    Scheduling: CommitStory[];
    Inventory: CommitStory[];
    Communication: CommitStory[];
  };
  lastUpdated: string;
}

export default function CommitStoryPage() {
  const [data, setData] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/commit-story')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="container">Loading commit story...</div>;
  }

  if (error) {
    return <div className="container">Error: {error}</div>;
  }

  return (
    <div className="container">
      <header className="story-header">
        <h1>Building SailorSkills: Solving Real Problems for Hull Cleaners</h1>
        <p className="subtitle">
          Active development of solutions to marine service challenges
        </p>
        {data && (
          <p className="last-updated">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </p>
        )}
      </header>

      <main>
        {data && Object.entries(data.categories).map(([category, stories]) => (
          stories.length > 0 && (
            <CategorySection
              key={category}
              category={category}
              stories={stories}
            />
          )
        ))}
      </main>
    </div>
  );
}

interface CategorySectionProps {
  category: string;
  stories: CommitStory[];
}

function CategorySection({ category, stories }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(category === 'Operations');

  return (
    <section className="category-section">
      <h2 onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        {category} Solutions - {stories.length} features
        <span>{expanded ? ' ▼' : ' ▶'}</span>
      </h2>

      {expanded && (
        <div className="feature-cards">
          {stories.map((story, idx) => (
            <div key={idx} className="feature-card">
              <p className="business-impact">{story.business_impact}</p>
              <div className="feature-meta">
                <span className="date-badge">
                  Added {new Date(story.date).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <a
                  href={`https://github.com/standardhuman/sailorskills-repos/commit/${story.commit_sha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="commit-link"
                >
                  View commit
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

**Step 2: Add styles for commit story page**

```css
/* Add to src/App.css */

.story-header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 1rem;
}

.story-header h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #1a365d;
}

.subtitle {
  font-size: 1.25rem;
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.last-updated {
  font-size: 0.9rem;
  color: #718096;
}

.category-section {
  margin-bottom: 2rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  background: white;
}

.category-section h2 {
  color: #2d3748;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feature-cards {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.feature-card {
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  padding: 1rem;
  background: #f7fafc;
}

.business-impact {
  color: #2d3748;
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.feature-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.date-badge {
  color: #4a5568;
  background: #edf2f7;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.commit-link {
  color: #3182ce;
  text-decoration: none;
}

.commit-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .story-header h1 {
    font-size: 1.75rem;
  }

  .feature-meta {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}
```

**Step 3: Update routing to include story page**

Modify `src/App.jsx` to add the route:

```jsx
// Add import
import CommitStoryPage from './pages/CommitStoryPage';

// Add route in your router configuration
// Example for React Router:
<Route path="/story" element={<CommitStoryPage />} />
```

**Step 4: Test page component**

Run: `npm run dev`
Navigate to: `http://localhost:3000/story`
Expected: Story page loads with categorized commits

**Step 5: Commit page component**

```bash
git add src/pages/CommitStoryPage.tsx src/App.css src/App.jsx
git commit -m "[FEATURE] Add commit story page with categorized display"
```

---

## Task 6: Add Vercel KV caching (optional but recommended)

**Note:** This requires Vercel KV to be set up in your Vercel project dashboard.

**Files:**
- Create: `lib/kv-cache.js`
- Modify: `api/commit-story.js:1-20`

**Step 1: Create KV cache utility**

```javascript
// lib/kv-cache.js
import { kv } from '@vercel/kv';

const CACHE_KEY = 'commit-story-v1';
const CACHE_TTL = 3600; // 1 hour in seconds

export async function getCachedStory() {
  try {
    return await kv.get(CACHE_KEY);
  } catch (error) {
    console.error('KV cache read error:', error);
    return null;
  }
}

export async function setCachedStory(data) {
  try {
    await kv.set(CACHE_KEY, data, { ex: CACHE_TTL });
    return true;
  } catch (error) {
    console.error('KV cache write error:', error);
    return false;
  }
}
```

**Step 2: Update edge function to use cache**

```javascript
// At top of api/commit-story.js
import { getCachedStory, setCachedStory } from '../lib/kv-cache.js';

// In handler function, add cache check before fetching
export default async function handler(request) {
  try {
    // Check cache first
    const cached = await getCachedStory();
    if (cached) {
      return new Response(
        JSON.stringify(cached),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    // ... rest of existing code ...

    // Before returning, cache the result
    const result = {
      categories: categorized,
      lastUpdated: new Date().toISOString(),
    };
    await setCachedStory(result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Step 3: Add @vercel/kv dependency**

```bash
npm install @vercel/kv
```

**Step 4: Test caching locally**

Run: `vercel dev`
First request: Check response header `X-Cache: MISS`
Second request: Check response header `X-Cache: HIT`

**Step 5: Commit caching implementation**

```bash
git add lib/kv-cache.js api/commit-story.js package.json package-lock.json
git commit -m "[FEATURE] Add Vercel KV caching for commit story"
```

---

## Task 7: Create Playwright test for commit story

**Files:**
- Create: `tests/e2e/commit-story.spec.js`

**Step 1: Write test for commit story page**

```javascript
// tests/e2e/commit-story.spec.js
import { test, expect } from '@playwright/test';

test.describe('Commit Story Page', () => {
  test('should load commit story page', async ({ page }) => {
    await page.goto('/story');

    // Check header
    await expect(page.locator('h1')).toContainText('Building SailorSkills');

    // Check subtitle
    await expect(page.locator('.subtitle')).toBeVisible();

    // Wait for data to load
    await page.waitForSelector('.category-section', { timeout: 10000 });
  });

  test('should display categorized features', async ({ page }) => {
    await page.goto('/story');

    // Wait for categories to load
    await page.waitForSelector('.category-section', { timeout: 10000 });

    // Check that at least one category is present
    const categories = page.locator('.category-section');
    await expect(categories).toHaveCount({ greaterThan: 0 });
  });

  test('should expand and collapse categories', async ({ page }) => {
    await page.goto('/story');

    // Wait for page load
    await page.waitForSelector('.category-section h2', { timeout: 10000 });

    // Find first category header
    const firstCategory = page.locator('.category-section h2').first();
    await firstCategory.click();

    // Check if feature cards are visible or hidden
    const featureCards = page.locator('.feature-cards').first();
    const isVisible = await featureCards.isVisible();

    // Click again to toggle
    await firstCategory.click();
    const isVisibleAfter = await featureCards.isVisible();

    // State should have changed
    expect(isVisible).not.toBe(isVisibleAfter);
  });

  test('should display feature cards with metadata', async ({ page }) => {
    await page.goto('/story');

    // Wait for data
    await page.waitForSelector('.feature-card', { timeout: 10000 });

    const firstCard = page.locator('.feature-card').first();

    // Check business impact text
    await expect(firstCard.locator('.business-impact')).toBeVisible();

    // Check date badge
    await expect(firstCard.locator('.date-badge')).toBeVisible();

    // Check commit link
    await expect(firstCard.locator('.commit-link')).toBeVisible();
  });

  test('should have working GitHub commit links', async ({ page }) => {
    await page.goto('/story');

    // Wait for feature cards
    await page.waitForSelector('.commit-link', { timeout: 10000 });

    const commitLink = page.locator('.commit-link').first();

    // Check link href contains GitHub URL
    const href = await commitLink.getAttribute('href');
    expect(href).toContain('github.com');
    expect(href).toContain('commit');
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/story');

    // Check header is visible
    await expect(page.locator('h1')).toBeVisible();

    // Check categories display properly
    await page.waitForSelector('.category-section', { timeout: 10000 });
    const sections = page.locator('.category-section');
    await expect(sections.first()).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API call and return error
    await page.route('**/api/commit-story', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'API error' }),
      });
    });

    await page.goto('/story');

    // Should display error message
    await expect(page.locator('text=Error')).toBeVisible();
  });
});
```

**Step 2: Run tests**

```bash
npx playwright test tests/e2e/commit-story.spec.js
```

Expected: All tests pass

**Step 3: Commit tests**

```bash
git add tests/e2e/commit-story.spec.js
git commit -m "[TEST] Add Playwright tests for commit story page"
```

---

## Task 8: Deploy to Vercel and configure environment variables

**Step 1: Push to GitHub**

```bash
git push origin feature/commit-story-ui
```

**Step 2: Configure Vercel environment variables**

In Vercel dashboard for sailorskills-site project:
1. Go to Settings → Environment Variables
2. Add `GITHUB_TOKEN` (your GitHub personal access token with repo read access)
3. Add `GEMINI_API_KEY` (your Gemini API key)
4. Add `GITHUB_ORG` = `standardhuman`
5. Add `GITHUB_REPO` = `sailorskills-repos`

**Step 3: Deploy to preview**

Vercel will auto-deploy from the PR. Check the preview URL.

**Step 4: Test preview deployment**

Visit: `https://sailorskills-site-<branch>-<hash>.vercel.app/story`
Expected: Story page loads with real commit data

**Step 5: Merge to main**

After testing preview:
```bash
git checkout main
git merge feature/commit-story-ui
git push origin main
```

**Step 6: Verify production deployment**

Visit: `https://sailorskills-site.vercel.app/story`
Expected: Story page works in production

---

## Task 9: Add navigation link to story page

**Files:**
- Modify: `index.html` or navigation component

**Step 1: Add link to main navigation**

Example for HTML-based nav:
```html
<!-- Add to navigation menu -->
<nav>
  <!-- existing links -->
  <a href="/story">Our Story</a>
</nav>
```

Or for React component nav:
```jsx
<Link to="/story">Our Story</Link>
```

**Step 2: Test navigation**

Navigate from homepage to story page via nav link.
Expected: Link works, page loads correctly

**Step 3: Commit navigation update**

```bash
git add index.html  # or navigation component file
git commit -m "[UI] Add navigation link to commit story page"
git push origin main
```

---

## Completion Checklist

- [ ] Environment variables configured in .env.example and Vercel
- [ ] Edge function fetches commits from GitHub API
- [ ] Gemini AI translates commits to business language
- [ ] Commits categorized by pain point (Operations, Billing, etc.)
- [ ] React page displays categorized stories
- [ ] Categories are expandable/collapsible
- [ ] Commit links to GitHub work
- [ ] Mobile responsive design
- [ ] Playwright tests pass
- [ ] Deployed to Vercel production
- [ ] Navigation link added
- [ ] All changes pushed to git

---

## Future Enhancements (Out of Scope)

- Date range filter (Last 30/60/90 days)
- Search functionality
- Manual cache refresh endpoint
- Email digest of new features
- Share story via unique URL
- Print stylesheet optimization
