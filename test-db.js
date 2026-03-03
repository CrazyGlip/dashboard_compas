const url = "https://yrlxygbsmfndcfntdmon.supabase.co";
const key = "sb_publishable_zv8p3QRlK2KEtMdvIAjk-A_ShkBTalx";

async function queryTable(tableName) {
    try {
        const res = await fetch(`${url}/rest/v1/${tableName}?select=*&limit=1`, {
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`
            }
        });
        const data = await res.json();
        console.log(`--- ${tableName} ---`);
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    await queryTable('specialties');
    await queryTable('colleges');
    await queryTable('top_professions');
    await queryTable('quizzes');
    await queryTable('quiz_questions');
    await queryTable('quiz_answers');
}
main();
