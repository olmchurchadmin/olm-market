-- Add superadmin enum value (must commit before use in later migration).
alter type public.user_role add value if not exists 'superadmin';
