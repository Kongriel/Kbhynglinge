# KBH Ynglinge – spørgeskema 2026/27

Statisk HTML/CSS/JS-projekt til Vercel med Supabase.

## Før du starter

1. Kør `supabase.sql` i Supabase SQL Editor (én gang).
2. Opret en bruger under Supabase Authentication → Users.
3. Find brugerens UUID, og kør i SQL Editor:
   `insert into public.ynglinge_admin_users (user_id) values ('DIN-UUID');`
4. Udfyld URL og publishable key/anon key i `config.js`.
5. Indsæt dine egne billeder: `assets/background.jpg` og `assets/logo.png`.
6. Deploy projektmappen til Vercel som statisk projekt (ingen build-kommando nødvendig).

Offentlig formular: `/`
Admin: `/admin/`

`service_role`/`secret key` må **aldrig** indsættes i frontend.

Inden lancering: tilføj jeres aktuelle privatlivsoplysninger, kontaktoplysninger, slettefrist og procedure for billedsamtykke, herunder for mindreårige.
