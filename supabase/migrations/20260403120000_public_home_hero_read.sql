-- Lejo leximin e përmbajtjes publike të faqes kryesore (pa login) dhe imazhet hero/* në storage.

drop policy if exists anon_read_website_home_hero on public.website_content;
create policy anon_read_website_home_hero on public.website_content
  for select to anon
  using (section_key = 'home_hero');

drop policy if exists "Public read hero folder in erp-images" on storage.objects;
create policy "Public read hero folder in erp-images"
  on storage.objects for select to anon
  using (bucket_id = 'erp-images' and name like 'hero/%');
