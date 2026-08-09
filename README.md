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

- Google / Kakao / 이메일+비밀번호 로그인 (회원가입, 비밀번호 찾기 포함)
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
   - Redirect URLs: `https://olm-market.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
2. Authentication → Sign In / Providers → Google Enable + Client ID/Secret
3. Google Cloud Redirect URI: `https://fktvadbfasmnfuduueko.supabase.co/auth/v1/callback`
4. SQL Editor에서 `supabase/migrations/20260802140000_church_market_schema.sql` 전체 Run

### 2b. Kakao login (카카오로 계속)
앱 버튼은 이미 연결되어 있습니다. **카카오 개발자 + Supabase Provider**만 켜면 됩니다.

1. [Kakao Developers](https://developers.kakao.com) → 앱 생성  
2. **앱 설정 → 앱 → 플랫폼 키**에서 REST API 키(Client ID), Client Secret 확인 · Client Secret **활성화**  
3. 같은 화면 **Kakao Login Redirect URI**에 추가:  
   `https://fktvadbfasmnfuduueko.supabase.co/auth/v1/callback`  
4. **제품 설정 → 카카오 로그인 → 일반**: 사용 설정 **ON**  
5. **동의 항목**: `profile_nickname` 필수, `account_email` 가능하면 선택  
   - 이메일이 없으면 Supabase Kakao 설정에서 **Allow users without an email** 켜기  
   - `account_email`은 Biz 앱일 때만 가능한 경우가 많음  
6. Supabase → Authentication → Providers → **Kakao Enable**  
   - Client ID = REST API 키  
   - Client Secret = Kakao Client Secret  
7. (권장) SQL Editor에서 `supabase/migrations/20260809195000_profile_kakao_metadata.sql` Run  
8. 사이트에서 **카카오로 계속** 클릭해 테스트

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
