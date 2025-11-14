// share-and-copy function disabled. Previously this edge function copied storage
// objects into the shared bucket for cabinet sharing. Sharing has been removed
// from the project; keep a small stub that returns 410 Gone for all requests.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((req) => {
  return new Response(JSON.stringify({ error: 'Sharing disabled: share-and-copy function removed.' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
});
