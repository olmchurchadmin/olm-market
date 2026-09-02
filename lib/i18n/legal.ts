import type { Locale } from "@/lib/i18n/config";
import { getRegisteredBrandName } from "@/lib/legal/brand";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalPage = {
  title: string;
  brandName: string;
  operatorLabel: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const siteUrl = "https://olm.skyface.com";
const contactEmail = "office@edisonkcc.org";

function privacyEn(brandName: string): LegalPage {
  return {
    title: "Privacy Policy",
    brandName,
    operatorLabel: "Operator",
    updated: "September 1, 2026",
    intro: `This Privacy Policy applies to ${brandName} ("we", "us", or "our"). ${brandName} operates the OLM Market parish garage-sale website at ${siteUrl}. This policy explains how we collect, use, and protect your information.`,
    sections: [
      {
        title: "About us",
        paragraphs: [
          `${brandName} operates OLM Market at ${siteUrl}. OLM Market is a transactional marketplace for parish community members.`,
        ],
      },
      {
        title: "Information we collect",
        paragraphs: [
          "When you create an account or use the marketplace, we may collect your name, email address, optional notification email, optional mobile phone number, listing and transaction details, and messages you send through the service.",
        ],
      },
      {
        title: "How we use your information",
        paragraphs: [
          "We use your information to operate the parish marketplace, authenticate users, display listings, coordinate in-person pickup, send transactional notifications, and respond to support or admin requests.",
        ],
        bullets: [
          "In-app notifications about listings and trades",
          "Email alerts for listing and trade events (if you provide an email)",
        ],
      },
      {
        title: "Email alerts",
        paragraphs: [
          `If you save a notification email on your profile at /account/profile (or use a login email), you consent to receive transactional emails from ${brandName} about OLM Market activity (for example, when an item is listed, reserved, dropped off at church, or ready for pickup).`,
          "We do not use email for marketing or promotional messages. Message frequency varies based on your marketplace activity.",
          `Your email is used only to deliver ${brandName} transactional alerts for OLM Market through our email provider (Resend).`,
        ],
      },
      {
        title: "Sharing of information",
        paragraphs: [
          "We share limited information only as needed to operate the service—for example, buyer and seller names shown in trade notifications, or data processed by service providers such as hosting, email, and database partners. We do not sell personal information.",
        ],
      },
      {
        title: "Data retention and security",
        paragraphs: [
          "We retain account and transaction data while your account is active and as needed for parish marketplace operations. We use reasonable administrative and technical safeguards, but no online service can guarantee absolute security.",
        ],
      },
      {
        title: "Children",
        paragraphs: [
          `${brandName} / OLM Market is intended for parish community members. If you believe a child has provided personal information without appropriate consent, contact us and we will take reasonable steps to delete it.`,
        ],
      },
      {
        title: "Changes and contact",
        paragraphs: [
          `${brandName} may update this policy from time to time. Continued use of the service after changes means you accept the updated policy.`,
          `Questions about this policy: ${contactEmail}.`,
        ],
      },
    ],
  };
}

function privacyKo(brandName: string): LegalPage {
  return {
    title: "개인정보처리방침",
    brandName,
    operatorLabel: "운영 주체",
    updated: "2026년 9월 1일",
    intro: `본 개인정보처리방침은 ${brandName}(이하 "우리")에 적용됩니다. ${brandName}는 OLM Market(${siteUrl})을 운영합니다.`,
    sections: [
      {
        title: "운영 주체",
        paragraphs: [
          `${brandName}가 ${siteUrl} OLM Market을 운영합니다. OLM Market은 성당 공동체를 위한 거래 장터입니다.`,
        ],
      },
      {
        title: "수집하는 정보",
        paragraphs: [
          "계정 생성 및 장터 이용 시 이름, 이메일, 선택적 알림 이메일, 선택적 휴대폰 번호, 물품·거래 정보, 서비스를 통해 보낸 메시지 등을 수집할 수 있습니다.",
        ],
      },
      {
        title: "정보 이용 목적",
        paragraphs: [
          "성당 장터 운영, 로그인, 물품 표시, 대면 픽업 조율, 거래 알림 발송, 문의·관리 대응에 정보를 사용합니다.",
        ],
        bullets: [
          "물품·거래 관련 앱 내 알림",
          "물품·거래 이메일 알림(이메일 제공 시)",
        ],
      },
      {
        title: "이메일 알림",
        paragraphs: [
          `/account/profile에서 알림 이메일을 저장하면(또는 로그인 이메일이 있으면), ${brandName}의 OLM Market 거래 알림(등록, 예약, 성당 전달, 픽업 등) 이메일 수신에 동의한 것으로 간주됩니다.`,
          "마케팅·홍보 메일은 보내지 않습니다. 발송 빈도는 거래 활동에 따라 달라집니다.",
          `이메일은 ${brandName}의 OLM Market 거래 알림 전달(이메일 발송 업체 Resend 이용)에만 사용됩니다.`,
        ],
      },
      {
        title: "정보 공유",
        paragraphs: [
          "서비스 운영에 필요한 범위에서만 정보를 공유합니다(예: 거래 알림에 표시되는 구매자·판매자 이름, 호스팅·이메일·DB 등 처리 업체). 개인정보를 판매하지 않습니다.",
        ],
      },
      {
        title: "보관 및 보안",
        paragraphs: [
          "계정 및 거래 데이터는 계정이 활성인 동안 및 성당 장터 운영에 필요한 기간 보관합니다. 합리적인 보호 조치를 사용하나, 온라인 서비스는 절대적 보안을 보장할 수 없습니다.",
        ],
      },
      {
        title: "아동",
        paragraphs: [
          `${brandName} / OLM Market은 성당 공동체 회원을 위한 서비스입니다. 아동이 부적절하게 정보를 제공했다고 판단되면 연락 주시면 삭제 등 조치하겠습니다.`,
        ],
      },
      {
        title: "변경 및 문의",
        paragraphs: [
          `${brandName}는 본 방침을 변경할 수 있으며, 변경 후 서비스를 계속 이용하면 변경에 동의한 것으로 봅니다.`,
          `문의: ${contactEmail}`,
        ],
      },
    ],
  };
}

function termsEn(brandName: string): LegalPage {
  return {
    title: "Terms and Conditions",
    brandName,
    operatorLabel: "Operator",
    updated: "September 1, 2026",
    intro: `These Terms and Conditions are a binding agreement between you and ${brandName} ("we", "us", or "our"). ${brandName} operates OLM Market at ${siteUrl}.`,
    sections: [
      {
        title: "About us",
        paragraphs: [
          `${brandName} operates OLM Market at ${siteUrl}. By using this website, you agree to these Terms.`,
        ],
      },
      {
        title: "Service description",
        paragraphs: [
          "OLM Market lets parish members list used items, reserve purchases, and complete trades through in-person pickup. The service does not process online payments.",
        ],
      },
      {
        title: "Eligibility and accounts",
        paragraphs: [
          "You must provide accurate account information and keep your login credentials secure. You are responsible for activity under your account.",
        ],
      },
      {
        title: "Listings and trades",
        paragraphs: [
          "Sellers are responsible for accurate listings, lawful items, and delivering items as described. Buyers reserve items in good faith and complete payment in cash at pickup as arranged.",
        ],
        bullets: [
          "Payment is in person in cash unless parish staff instruct otherwise",
          "Pickup may be at church or another location listed on the item",
          "Parish administrators may cancel listings or trades that violate community rules",
        ],
      },
      {
        title: "Notifications",
        paragraphs: [
          "By saving a notification email on your profile, you agree to receive transactional notifications by email as described in our Privacy Policy. Marketing messages are not sent through this service.",
        ],
      },
      {
        title: "Prohibited use",
        paragraphs: [
          "Do not use the service for illegal goods, harassment, fraud, spam, or content that violates parish community standards. We may remove content or suspend accounts at our discretion.",
        ],
      },
      {
        title: "Disclaimer",
        paragraphs: [
          "OLM Market is provided as-is for community convenience. The parish is not a party to private sales between members except where administrators facilitate pickup or payment collection. Items are sold as-is unless otherwise agreed between buyer and seller.",
        ],
      },
      {
        title: "Changes and contact",
        paragraphs: [
          `${brandName} may update these Terms from time to time. Continued use after changes constitutes acceptance.`,
          `Questions: ${contactEmail}. See also our Privacy Policy at ${siteUrl}/privacy.`,
        ],
      },
    ],
  };
}

function termsKo(brandName: string): LegalPage {
  return {
    title: "이용약관",
    brandName,
    operatorLabel: "운영 주체",
    updated: "2026년 9월 1일",
    intro: `본 약관은 ${brandName}(이하 "우리")와 이용자 간의 계약입니다. ${brandName}는 OLM Market(${siteUrl})을 운영합니다.`,
    sections: [
      {
        title: "운영 주체",
        paragraphs: [
          `${brandName}가 ${siteUrl} OLM Market을 운영합니다. 본 사이트를 이용하면 본 약관에 동의한 것으로 봅니다.`,
        ],
      },
      {
        title: "서비스 개요",
        paragraphs: [
          "OLM Market은 성당 회원이 중고 물품을 등록·예약·대면 인도로 거래하는 장터입니다. 온라인 결제는 제공하지 않습니다.",
        ],
      },
      {
        title: "계정",
        paragraphs: [
          "정확한 정보를 제공하고 로그인 정보를 안전하게 관리해야 합니다. 본인 계정에서 이루어진 활동에 대한 책임은 이용자에게 있습니다.",
        ],
      },
      {
        title: "물품 및 거래",
        paragraphs: [
          "판매자는 물품 정보의 정확성, 합법성, 약속한 방식의 인도에 책임집니다. 구매자는 예약 후 약정에 따라 현장에서 현금 결제 등을 진행합니다.",
        ],
        bullets: [
          "결제는 별도 안내가 없는 한 현장 현금",
          "픽업은 물품에 표시된 성당 또는 판매자 장소",
          "관리자는 규정 위반 물품·거래를 취소할 수 있음",
        ],
      },
      {
        title: "알림",
        paragraphs: [
          "프로필에 알림 이메일을 저장하면 개인정보처리방침에 따라 거래 알림 이메일을 받을 수 있습니다. 마케팅 메시지는 발송하지 않습니다.",
        ],
      },
      {
        title: "금지 행위",
        paragraphs: [
          "불법 물품, 사기, 괴롭힘, 스팸, 성당 공동체 기준에 어긋나는 이용을 금합니다. 위반 시 삭제·계정 정지할 수 있습니다.",
        ],
      },
      {
        title: "면책",
        paragraphs: [
          "본 서비스는 공동체 편의를 위해 제공됩니다. 회원 간 거래는 원칙적으로 당사자 간 책임이며, 물품은 별도 합의가 없는 한 있는 그대로 판매됩니다.",
        ],
      },
      {
        title: "변경 및 문의",
        paragraphs: [
          `${brandName}는 약관을 변경할 수 있으며, 변경 후 이용은 변경에 동의한 것으로 봅니다.`,
          `문의: ${contactEmail}. 개인정보처리방침: ${siteUrl}/privacy`,
        ],
      },
    ],
  };
}

export function getPrivacyPage(locale: Locale): LegalPage {
  const brandName = getRegisteredBrandName();
  return locale === "ko" ? privacyKo(brandName) : privacyEn(brandName);
}

export function getTermsPage(locale: Locale): LegalPage {
  const brandName = getRegisteredBrandName();
  return locale === "ko" ? termsKo(brandName) : termsEn(brandName);
}
