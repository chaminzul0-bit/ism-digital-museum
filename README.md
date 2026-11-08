# ISM Digital Museum

Мэдээллийн Системийн Менежментийн тэнхимийн түүх, багш нар, арга хэмжээ, оюутнуудын бүтээлийг нэг дор харуулах интерактив дижитал музей. (Internet Programming — Гэрийн даалгавар №1)

**Stack:** React + JavaScript (Vite), React Router, Supabase (Auth, PostgreSQL, Storage, RLS), Vercel.

## Боломжууд
- Үзмэрийн жагсаалт, дэлгэрэнгүй хуудас; нэр / технологи / ангилал / оноор хайх, шүүх (үр дүнгүй үед мэдэгдэл)
- Багш нар, өдөрлөг ба арга хэмжээ, зурагт цомог (lightbox)
- Бүртгэл, нэвтрэлт, гаралт
- Оюутан өөрийн бүтээлийг нэмэх / засах / устгах, зураг Supabase Storage-д хадгална
- Админ самбар: багш, арга хэмжээ, цомгийн зураг, түүх, ангилал
- **Бүтээлч шийдэл — ISM Time Machine (`/timeline`):** түүх, арга хэмжээ, үзмэрийг нэг шугаман дээр он цагийн дарааллаар үзүүлж, гулсуураар он сонгож, төрлөөр шүүнэ.

## Суулгах
1. supabase.com дээр төсөл үүсгэнэ.
2. SQL Editor дээр `supabase/schema.sql`-г бүтнээр ажиллуулна (хүснэгт, RLS, storage bucket, жишиг өгөгдөл).
3. `.env.example`-г `.env` болгож Project Settings → API-аас URL ба **anon** key-г хуулна.
4. `npm install && npm run dev`
5. Админ болгох: сайтад бүртгүүлсний дараа SQL Editor дээр
   `update public.profiles set role='admin' where id = '<auth user id>';`

## Өгөгдлийн сангийн бүтэц (ERD)
```
auth.users 1─1 profiles 1─* exhibits *─1 exhibition_categories
events 1─* event_photos      teachers      history_entries
```
- **PK:** хүснэгт бүрийн `id` (uuid) мөрийг давтагдашгүй тодорхойлно; `profiles.id` нь `auth.users.id`-тэй адил.
- **FK:** `exhibits.creator_id → profiles.id` (бүтээгч), `exhibits.category_id → exhibition_categories.id` (ангилал), `event_photos.event_id → events.id` (цомог, арга хэмжээ устахад зураг дагаж устна).

## Аюулгүй байдал (RLS)
- Нийтлэгдсэн үзмэр, багш, арга хэмжээг хүн бүр уншина.
- `exhibits`-ийг зөвхөн `creator_id = auth.uid()` эзэмшигч (эсвэл админ) засна/устгана.
- Бусад хүснэгтэд зөвхөн админ бичнэ; `role`-г хэрэглэгч өөрөө өөрчилж чадахгүй.
- Storage: зөвхөн өөрийн `uid/` хавтас руу зураг оруулна.
- Frontend-д зөвхөн public **anon** key ашигласан; service role key байхгүй.

## Vercel deploy
GitHub-д push → vercel.com → Add New Project → repo сонгох → Environment Variables-д `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` нэмээд Deploy. (`vercel.json` нь SPA route-уудыг зөв ажиллуулна.)
