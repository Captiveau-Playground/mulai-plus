# 📊 SEO & Analytics Audit — MULAI+

> **Audit Date:** 2026-06-04
> **Target Peringkat:** #1 di Indonesia untuk keyword terkait bimbingan universitas & jurusan
> **Tools:** GA4, GTM, Microsoft Clarity, Cookie Consent

---

## 🔴 Critical Issues (Harus Segera Diperbaiki)

### 1. Client-Side Meta Tags di Halaman Blog

**File:** `blog/articles/[slug]/page.tsx` & `blog/news/[slug]/page.tsx`

```tsx
// ❌ Client-side — Google & social crawlers TIDAK membaca ini
<title>{article.seo?.metaTitle || article.title}</title>
{article.seo?.metaDescription && <meta name="description" content={article.seo.metaDescription} />}
```

**Masalah:** Kedua halaman ini adalah `"use client"` component. Googlebot dan crawler sosial (Facebook, Twitter, LinkedIn) tidak mengeksekusi JavaScript — mereka cuma lihat HTML server-rendered. Akibatnya:
- **Google** — meta title & description kosong, Google pake snippet random
- **Facebook/LinkedIn** — og:title, og:description, og:image KOSONG
- **Twitter/X** — twitter:card KOSONG

**Solusi:** Ubah jadi **Server Component** dengan `generateMetadata()`:

```tsx
// ✅ Server Component — dibaca crawler
import { db, eq, schema, and, isNull } from "@mulai-plus/db";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await db.query.cmsArticle.findFirst({
    where: and(eq(schema.cmsArticle.slug, params.slug), eq(schema.cmsArticle.status, "published")),
    with: { seo: true, author: true },
  });
  if (!article) return {};
  return {
    title: article.seo?.metaTitle || article.title,
    description: article.seo?.metaDescription || article.excerpt,
    openGraph: {
      title: article.seo?.metaTitle || article.title,
      description: article.seo?.metaDescription || article.excerpt,
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
      authors: [article.author?.name].filter(Boolean),
      images: article.seo?.ogImageUrl
        ? [{ url: article.seo.ogImageUrl, width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.seo?.metaTitle || article.title,
      description: article.seo?.metaDescription || article.excerpt,
      images: article.seo?.ogImageUrl ? [article.seo.ogImageUrl] : undefined,
    },
  };
}
```

### 2. Canonical URL Salah di Root Layout

**File:** `app/layout.tsx`
```tsx
export const metadata: Metadata = {
  alternates: {
    canonical: "/", // ❌ Semua halaman pake canonical "/"
  },
};
```

**Masalah:** Semua halaman dapet canonical URL `"/"` karena cuma didefinisikan di root layout. Ini bikin Google bingung dan berpotensi **duplicate content penalty**.

**Solusi:** Hapus `canonical` dari root layout, tambah di setiap page metadata masing-masing:
```tsx
// Di setiap page:
export const metadata = {
  alternates: {
    canonical: "/programs", // sesuai halaman
  },
};
```

### 3. Semua Public Pages Pake `"use client"`

| Halaman | Status | Metadata |
|---------|--------|----------|
| `/` (homepage) | `"use client"` | ✅ Ada JSON-LD inline |
| `/programs` | `"use client"` | ❌ Cuma title/desc di layout |
| `/programs/[slug]` | `"use client"` | ✅ Ada JSON-LD inline |
| `/blog` | `"use client"` | ❌ **Tidak ada metadata sama sekali** |
| `/blog/articles` | `"use client"` | ❌ **Tidak ada metadata** |
| `/blog/articles/[slug]` | `"use client"` | ❌ **Client-side meta tags (rusak)** |
| `/blog/news` | `"use client"` | ❌ **Tidak ada metadata** |
| `/blog/news/[slug]` | `"use client"` | ❌ **Sama seperti articles** |
| `/courses` | `"use client"` | ❌ **Tidak ada metadata** |
| `/courses/[slug]` | `"use client"` | ❌ **Tidak ada metadata** |
| `/categories` | `"use client"` | ❌ **Tidak ada metadata** |
| `/privacy` | ✅ Server | ✅ Ada metadata |

---

## 🟡 High Priority

### 4. HTML `lang` Attribute

```html
<html lang="id" suppressHydrationWarning>
```

✅ Udah bener `lang="id"` — bagus buat SEO lokal Indonesia.

### 5. hreflang Tidak Ada

**Masalah:** Tidak ada tag hreflang untuk konten Indonesia. Meskipun targetnya cuma Indonesia, tetap perlu:

```tsx
export const metadata = {
  alternates: {
    languages: {
      "id-ID": "/",
    },
  },
};
```

### 6. Open Graph & Twitter Card Tidak Konsisten

Root layout udah define OG & Twitter card, tapi:
- Halaman `/programs` → ✅ Ada title/desc di layout, ✅ OG title/desc
- Halaman `/programs/[slug]` ❌ **Tidak ada OG tags spesifik per program**
- Halaman `/courses/*` ❌ **Tidak ada OG tags**
- Halaman `/blog/articles/[slug]` ❌ **Client-side, crawler ga baca**
- Halaman `/blog/news/[slug]` ❌ **Client-side, crawler ga baca**

### 7. JSON-LD Structured Data Tidak Konsisten

| Halaman | JSON-LD |
|---------|---------|
| `/` (homepage) | ✅ Organization, WebSite, WebPage, BreadcrumbList, FAQPage |
| `/programs/[slug]` | ✅ Organization, WebSite |
| `/programs` | ❌ **Tidak ada** |
| `/blog/articles/[slug]` | ❌ **Tidak ada Article/NewsArticle** |
| `/blog/*` | ❌ **Tidak ada** |
| `/courses/*` | ❌ **Tidak ada** |

---

## 🟢 Medium Priority

### 8. Sitemap

✅ Udah dibuat di `app/sitemap.ts` — static pages + dynamic routes dari DB.
✅ Build sukses, file tergenerate di `/sitemap.xml`.

### 9. Robots.txt

Next.js auto-generate robots.txt, tapi belum dicek isinya.

### 10. Google Analytics & Tracking

✅ **GA4 Measurement ID:** Terdefinisi di env `NEXT_PUBLIC_GA_MEASUREMENT_ID`
✅ **Cookie Consent Banner:** Ada floating banner, tracking cuma jalan setelah consent "accepted"
✅ **Page View Tracking:** Pake `usePageViewTracking` hook — fire `page_view` setiap route change
✅ **Microsoft Clarity:** Ada bersamaan dengan GA4
🔴 **Belum ada custom event tracking** (konversi, CTA clicks, form submissions)

### 11. Performance SEO

- ✅ Font loading pake next/font (Bricolage Grotesque, Manrope)
- ✅ Image optimization pake next/image
- ⚠️ Halaman `"use client"` berat — framer-motion, recharts, dll

---

## 📋 Tracking Plan — GA4

### Event Naming Convention: `object_action`

| Event Name | Category | Trigger | Properties | Priority |
|------------|----------|---------|------------|----------|
| `page_view` | Engagement | Automatic | page_title, page_location | ✅ Done |
| `cta_clicked` | Engagement | CTA button clicks | button_text, location | 🔴 Missing |
| `form_submitted` | Conversion | Registration/login form | form_type, method | 🔴 Missing |
| `signup_completed` | Conversion | Successful registration | method, source | 🔴 Missing |
| `program_viewed` | Engagement | Program detail page | program_name, program_id | 🔴 Missing |
| `program_applied` | Conversion | Program registration | program_name, batch_name | 🔴 Missing |
| `article_read` | Engagement | Scroll 75% article | article_title, article_id | 🔴 Missing |
| `course_viewed` | Engagement | Course detail page | course_name, course_id | 🔴 Missing |
| `search_performed` | Engagement | Blog/article search | search_term, result_count | 🔴 Missing |
| `mentor_clicked` | Engagement | Mentor profile click | mentor_name | 🔴 Missing |
| `newsletter_subscribed` | Conversion | Newsletter signup (footer) | source | 🔴 Missing |
| `error_occurred` | Errors | 404/error pages | error_code, page_path | 🔴 Missing |

### Konversi Utama (mark as conversion di GA4)

| Conversion | Event | Counting Method |
|------------|-------|----------------|
| Signup | `signup_completed` | Once per user |
| Program Application | `program_applied` | Once per session |
| Newsletter Subscribe | `newsletter_subscribed` | Once per user |
| Form Submit | `form_submitted` | Once per session |

---

## 🚀 Recommended Actions (Prioritized)

### Week 1 — Critical
1. **Refactor `blog/articles/[slug]` & `blog/news/[slug]`** — jadi Server Component + `generateMetadata()` + JSON-LD Article/NewsArticle
2. **Hapus `canonical: "/"` dari root layout** — tambah canonical per page
3. **Tambah metadata ke semua public pages** — minimal title, description, OG tags

### Week 2 — High
4. **Tambah JSON-LD ke halaman program, artikel, course**
5. **Tambah hreflang**
6. **Implement custom GA4 events** — CTA clicks, form submissions, conversions

### Week 3 — Medium
7. **Buat tracking plan dan dokumentasi UTM**
8. **Audit performa** — Core Web Vitals, LCP, FID, CLS
9. **Tambah alt text defaults ke semua image component**
10. **Pastikan robots.txt proper**

---

## 📈 Target Keyword Strategy (#1 Indonesia)

### Primary Keywords (Top Priority)
| Keyword | Volume (Estimasi) | Current Halaman | Action |
|---------|-------------------|-----------------|--------|
| bimbingan universitas | 🔥 Tinggi | Homepage | Optimasi content + FAQ |
| bimbingan jurusan kuliah | 🔥 Tinggi | Homepage | Buat landing page spesifik |
| konsultan pendidikan Indonesia | 🔥 Tinggi | - | **Belum ada halaman** |
| bimbingan beasiswa | 🔥 Tinggi | Program beasiswa | Optimasi program detail |
| mentoring masuk PTN | 🔥 Tinggi | Program reguler | Tambah testimoni + studi kasus |

### Secondary Keywords
| Keyword | Halaman Target |
|---------|---------------|
| cara memilih jurusan kuliah | Blog artikel |
| tips snbp 2026 | Blog artikel |
| perbedaan jurusan kuliah | Blog artikel |
| beasiswa Indonesia 2026 | Blog + program |
| universitas terbaik Indonesia | Blog artikel |

---

## 📍 Informasi Kantor

| Field | Value |
|-------|-------|
| Alamat | Techno Park UPN Veteran Jawa Timur, Jl. Taman Gianyar I, Gunung Anyar, Surabaya, Jawa Timur 60294 |
| Google Maps | [Lihat di Maps](https://maps.google.com/?q=Techno+Park+UPN+Veteran+Jawa+Timur) |
| Email | hello@mulaiplus.id |
| Phone | +62 85730367310 |

> **Catatan:** Alamat udah diupdate di `site-config.ts` (`CONTACT.locationDetail`, `CONTACT.mapsUrl`) dan footer otomatis pake `target="_blank"` untuk link external.

---

## 🔧 UTM Parameter Convention

Berdasarkan skill **analytics tracking**:

```
Format: lowercase, underscores for spaces
Source: google, instagram, linkedin, newsletter, whatsapp, direct
Medium: cpc, organic-social, email, referral, sms
Campaign: campaign_name (pakai underscores, deskriptif)
```

### Contoh UTM

| Channel | URL |
|---------|-----|
| Instagram Bio | `...?utm_source=instagram&utm_medium=organic-social&utm_campaign=profile_bio` |
| Google Ads | `...?utm_source=google&utm_medium=cpc&utm_campaign=brand_awareness_q2` |
| Newsletter | `...?utm_source=newsletter&utm_name=juni_2026&utm_medium=email` |
| WhatsApp Share | `...?utm_source=whatsapp&utm_medium=referral&utm_campaign=share_program` |

---

## 📁 File yang Perlu Diubah

| File | Priority | Perubahan |
|------|----------|-----------|
| `apps/web/src/app/layout.tsx` | 🔴 Critical | Hapus `canonical: "/"` |
| `apps/web/src/app/(app)/(front)/blog/articles/[slug]/page.tsx` | 🔴 Critical | Jadi Server Component + `generateMetadata` |
| `apps/web/src/app/(app)/(front)/blog/news/[slug]/page.tsx` | 🔴 Critical | Jadi Server Component + `generateMetadata` |
| `apps/web/src/app/(app)/(front)/programs/[slug]/page.tsx` | 🟡 High | Tambah `generateMetadata` |
| `apps/web/src/app/(app)/(front)/blog/page.tsx` | 🟡 High | Tambah metadata |
| `apps/web/src/app/(app)/(front)/blog/articles/page.tsx` | 🟡 High | Tambah metadata |
| `apps/web/src/app/(app)/(front)/blog/news/page.tsx` | 🟡 High | Tambah metadata |
| `apps/web/src/app/(app)/(front)/courses/page.tsx` | 🟡 High | Tambah metadata |
| `apps/web/src/app/(app)/(front)/courses/[slug]/page.tsx` | 🟡 High | Tambah metadata |
| `apps/web/src/app/(app)/(front)/categories/page.tsx` | 🟡 High | Tambah metadata |
| `apps/web/src/components/analytics-provider.tsx` | 🟢 Medium | Tambah custom event tracking |

---

> **Catatan:** Semua halaman public yang saat ini `"use client"` perlu di-refactor jadi Server Component (atau minimal punya server component wrapper untuk metadata) supaya crawler bisa baca meta tags dengan benar. Ini adalah **syarat mutlak** buat nomor 1 di Google Indonesia.
