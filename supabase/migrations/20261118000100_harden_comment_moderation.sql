-- Hardening for direct Supabase client writes.
-- New comments may only enter moderation with media owned by the uploader.

drop policy if exists "Authenticated users create comments" on public.comments;
create policy "Authenticated users create comments"
on public.comments for insert to authenticated
with check (
  reporter_id = auth.uid()
  and moderation_status = 'Pending Review'
  and (
    media_url is null
    or media_url like (auth.uid()::text || '/%')
  )
);

drop policy if exists "Users read issue media" on storage.objects;
create policy "Users read issue media"
on storage.objects for select to authenticated
using (
  bucket_id = 'issue-media'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_staff()
    or exists (
      select 1
      from public.comments c
      where c.media_url = name
        and c.moderation_status = 'Approved'
    )
    or exists (
      select 1
      from public.issues i
      where i.resolution_proof_url = name
        and i.moderation_status = 'Approved'
    )
  )
);
