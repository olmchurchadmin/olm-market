# OLM Market

성당 온라인 장터 (Next.js + Supabase).

## Accounts

| Service | Account / Project |
|---|---|
| GitHub | `olmchurchadmin/olm-market` |
| Supabase | `https://fktvadbfasmnfuduueko.supabase.co` |
| Vercel | `olmchurchadmin` 계정 + GitHub 연결 |
| Admin | `olmchurchadmin@gmail.com` |

## Features

- Google / Kakao / Email(매직 링크) 로그인
- 물품 사진·카테고리·설명·가격 등록
- 카테고리별 장터 + Buy 거래
- 인앱 + 이메일 + 카카오 알림톡 어댑터
- 관리자 드롭오프/픽업 + 일·주·월·년·전체 통계
- 현장 현금 결제

## Setup checklist

### 1. GitHub
이미 리포: https://github.com/olmchurchadmin/olm-market

### 2. Supabase (`olmchurchadmin`)
1. Authentication → URL Configuration
   - Site URL: Vercel production URL (예: `https://olm-market.vercel.app`)
   - Redirect URLs: `https://YOUR-VERCEL-URL/auth/callback`, `http://localhost:3000/auth/callback`
2. Authentication → Sign In / Providers → Google Enable + Client ID/Secret
3. Google Cloud Redirect URI: `https://fktvadbfasmnfuduueko.supabase.co/auth/v1/callback`
4. SQL Editor에서 `supabase/migrations/20260802140000_church_market_schema.sql` 전체 Run

### 3. Vercel (`olmchurchadmin`)
1. Import GitHub repo `olmchurchadmin/olm-market`
2. Environment Variables (Production / Preview / Development):

```
NEXT_PUBLIC_SUPABASE_URL=https://fktvadbfasmnfuduueko.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
SUPABASE_SERVICE_ROLE_KEY=<secret key>
NEXT_PUBLIC_SITE_URL=https://YOUR-VERCEL-URL
ADMIN_EMAIL=olmchurchadmin@gmail.com
```

3. Deploy

### 4. Local

```bash
cp .env.example .env.local
# fill keys
npm install
npm run dev
```

## Push from this machine

```bash
gh auth login   # olmchurchadmin 계정으로
git remote set-url origin https://github.com/olmchurchadmin/olm-market.git
git push -u origin main
```
