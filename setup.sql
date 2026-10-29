-- Run this in Supabase Dashboard > SQL Editor after creating the Storage bucket.
-- First create a bucket named "media" in Storage. For the simplest public download gallery,
-- set it to PUBLIC. Anyone with a media URL can access/download media.
-- Replace OWNER_UID_PLACEHOLDER with the UUID of the owner account in Supabase Auth.

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  caption text,
  created_at timestamptz not null default now()
);

alter table public.media enable row level security;

-- Visitors can browse the gallery.
create policy "Anyone can view media metadata"
on public.media for select
to anon, authenticated
using (true);

-- Only the designated owner account can add or remove database rows.
create policy "Only owner can add media rows"
on public.media for insert
to authenticated
with check (auth.uid() = 'OWNER_UID_PLACEHOLDER'::uuid and owner_id = auth.uid());

create policy "Only owner can delete media rows"
on public.media for delete
to authenticated
using (auth.uid() = 'OWNER_UID_PLACEHOLDER'::uuid);

-- Storage rules: public bucket permits downloads; writes are restricted to owner folder.
create policy "Anyone can download media objects"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'media');

create policy "Only owner can upload media objects"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'OWNER_UID_PLACEHOLDER'
  and auth.uid() = 'OWNER_UID_PLACEHOLDER'::uuid
);

create policy "Only owner can delete media objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'OWNER_UID_PLACEHOLDER'
  and auth.uid() = 'OWNER_UID_PLACEHOLDER'::uuid
);
