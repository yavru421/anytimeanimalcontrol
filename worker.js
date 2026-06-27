export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        if (request.method === "POST" && url.pathname === "/api/track-pdf") {
            const today = new Date().toISOString().split('T')[0];
            const userId = url.searchParams.get('userId') || 'unknown';
            
            try {
                if (!env.DB) {
                     return new Response(JSON.stringify({ error: "DB binding not found." }), { status: 500 });
                }

                // Upsert count per date + user
                const stmt = env.DB.prepare(`
                    INSERT INTO pdf_stats (tracking_date, user_id, total_generated)
                    VALUES (?1, ?2, 1)
                    ON CONFLICT(tracking_date, user_id) DO UPDATE SET total_generated = total_generated + 1;
                `).bind(today, userId);
                
                await stmt.run();
                return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
            } catch (err) {
                console.error("DB error:", err);
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
        }
        
        return env.ASSETS.fetch(request);
    }
}
