-- Phone SMS via Twilio (replaces Solapi/Kakao channel for outbound alerts).
alter type public.notification_channel add value if not exists 'sms';
