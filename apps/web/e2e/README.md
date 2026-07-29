# E2E Tests (Playwright)

## Struktur

```
apps/web/e2e/
├── playwright.config.ts
└── specs/
    ├── auth/
    │   └── login.spec.ts         ← Login page (1 test)
    └── public/
        ├── landing.spec.ts       ← Homepage hero, CTA, footer (4 tests)
        ├── explore.spec.ts       ← 5 halaman explore (5 tests)
        ├── blog.spec.ts          ← Blog, articles, news (3 tests)
        ├── programs.spec.ts      ← Programs, courses (2 tests)
        ├── errors.spec.ts        ← 404, auth redirect (3 tests)
        └── details.spec.ts       ← Privacy, terms, categories (3 tests)
```

## Pages Covered (21 halaman)

```
✅ /                          Landing
✅ /login                     Login
✅ /privacy                   Privacy
✅ /terms                     Terms
✅ /blog                      Blog
✅ /blog/articles             Articles
✅ /blog/news                 News
✅ /categories                Categories
✅ /courses                   Courses
✅ /explore                   Explore
✅ /explore/compare           Compare
✅ /explore/passing-grade     Passing grade
✅ /explore/study-programs    Study programs
✅ /explore/universities      Universities
✅ /programs                  Programs
✅ /404, /dashboard/*         Error + auth guard
```

## Run

```bash
cd apps/web

# Production build (lebih cepat, gak lag)
bun run build
NEXT_PUBLIC_SERVER_URL=http://localhost:3000 bun run start &
node node_modules/.bin/playwright test --config=e2e/playwright.config.ts --workers=3

# Atau dev server (existing)
node node_modules/.bin/playwright test --config=e2e/playwright.config.ts --workers=2

# UI mode
bun run test:e2e:ui
```
