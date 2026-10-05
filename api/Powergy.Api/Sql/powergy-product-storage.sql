create or replace function public.is_powergy_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.admin_users as admin
        where admin.supabase_user_id = (select auth.uid())
          and admin.is_active = true
          and admin.role = 'admin'
    );
$$;

revoke all on function public.is_powergy_admin() from public;
grant execute on function public.is_powergy_admin() to authenticated;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'powergy-product-images',
    'powergy-product-images',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "POWERGY product images are publicly readable" on storage.objects;
create policy "POWERGY product images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'powergy-product-images');

drop policy if exists "POWERGY admins can upload product images" on storage.objects;
create policy "POWERGY admins can upload product images"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'powergy-product-images'
    and public.is_powergy_admin()
);

drop policy if exists "POWERGY admins can update product images" on storage.objects;
create policy "POWERGY admins can update product images"
on storage.objects for update
to authenticated
using (
    bucket_id = 'powergy-product-images'
    and public.is_powergy_admin()
)
with check (
    bucket_id = 'powergy-product-images'
    and public.is_powergy_admin()
);

drop policy if exists "POWERGY admins can delete product images" on storage.objects;
create policy "POWERGY admins can delete product images"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'powergy-product-images'
    and public.is_powergy_admin()
);
