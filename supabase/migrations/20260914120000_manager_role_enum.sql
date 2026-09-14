-- Step 1: add enum value (must commit before it can be used in later migrations).
alter type public.user_role add value if not exists 'manager';
