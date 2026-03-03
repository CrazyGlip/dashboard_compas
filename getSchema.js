import 'dotenv/config';

console.log('Fetching schema from Supabase...', process.env.VITE_SUPABASE_URL);

fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`)
    .then(res => res.json())
    .then(openapi => {
        console.log('top_professions:', Object.keys(openapi.definitions.top_professions?.properties || {}));
        console.log('news:', Object.keys(openapi.definitions.news?.properties || {}));
        console.log('events:', Object.keys(openapi.definitions.events?.properties || {}));
    })
    .catch(console.error);
