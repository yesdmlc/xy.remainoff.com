import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createPolicy() {
  const { error } = await supabase.rpc('create_storage_policy');
  if (error) {
    console.error('Failed to create policy:', error);
  } else {
    console.log('Policy created successfully');
  }
}

createPolicy();
