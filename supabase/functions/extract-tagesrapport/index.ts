import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleExtract } from '../_shared/extract-handler.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve((req) =>
  handleExtract(req, { admin, env: (key) => Deno.env.get(key), fetchImpl: fetch }),
);
