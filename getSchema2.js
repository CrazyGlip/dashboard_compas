import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await sb.from('college_specialty_scores').select('*').limit(1);
    console.log('Data:', data);
    console.log('Error:', error);

    if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else if (data && data.length === 0) {
        // try to get openapi
        const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`);
        const openapi = await res.json();
        console.log('OpenAPI definitions for college_specialty_scores:', openapi.definitions?.college_specialty_scores?.properties);
    }
}

check();
