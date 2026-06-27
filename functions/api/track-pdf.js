export async function onRequestPost(context) {
    // context.env.DB is the bound D1 database
    const today = new Date().toISOString().split('T')[0];

    try {
        // Upsert query: Insert 1 if new date, otherwise increment existing count
        const stmt = context.env.DB.prepare(`
            INSERT INTO pdf_stats (tracking_date, total_generated)
            VALUES (?1, 1)
            ON CONFLICT(tracking_date) DO UPDATE SET total_generated = total_generated + 1;
        `).bind(today);
        
        await stmt.run();
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: 'Error tracking' }), {
            status: 500,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
}
