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
- 인앱 + 이메일 + Twilio SMS 알림
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
TWILIO_ACCOUNT_SID=<from Twilio Console>
TWILIO_AUTH_TOKEN=<from Twilio Console>
TWILIO_PHONE_NUMBER=<E.164 e.g. +17325551234>
```

### 3b. Twilio SMS
1. [Twilio Console](https://console.twilio.com) 가입 (트라이얼 가능)
2. Account SID / Auth Token 복사
3. Phone Numbers에서 미국 번호 발급 (또는 트라이얼 번호)
4. Vercel Environment Variables에 위 `TWILIO_*` 3개 추가 후 Redeploy
5. (DB) SQL Editor에서 `supabase/migrations/20260815170000_notification_channel_sms.sql` Run
6. 프로필에 휴대폰 저장 후 구매 테스트
   - 트라이얼: Twilio에서 수신 번호 Verify 필요 (최대 수개)

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
