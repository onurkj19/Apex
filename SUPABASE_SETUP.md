### Supabase setup

Follow these steps to migrate Products and Projects to Supabase.

1) Create project
- Go to `https://app.supabase.com` → New project
- Copy your Project URL and anon/public key
- In your `.env.local` (Vite), set:
  - `VITE_SUPABASE_URL=...`
  - `VITE_SUPABASE_ANON_KEY=...`

2) Create tables and storage
- Open Supabase SQL editor and run the SQL in `supabase/schema.sql`
- Create storage buckets:
  - Bucket `products` (public)
  - Bucket `projects` (public)

3) Policies (RLS)
- The provided SQL enables RLS and allows read for anon users, and insert/update/delete for authenticated users.
- Keep your admin access by signing into Admin Panel with a Supabase email/password user you create under Authentication → Users.

4) Configure environment
- Create `.env.local` in project root:
```
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_API_URL=http://localhost:5000/api
```

5) Using the Admin Panel
- Visit `/#/admin/login`, sign in with your Supabase Auth credentials
- Manage Products (title, description, price CHF, discount %, image) and Projects (title, description, location, completed date, client, category, duration, multiple images)

6) Notes
- Public store pages read directly from Supabase; no backend needed for Products/Projects.
- Stripe checkout remains handled by the existing backend.
- Uploaded images are stored in Supabase Storage and served via public URLs.


