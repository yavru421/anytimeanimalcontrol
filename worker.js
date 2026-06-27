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

                // Prepare batch queries
                const globalStmt = env.DB.prepare(`
                    UPDATE global_stats SET total_generated = total_generated + 1 WHERE id = 1 RETURNING total_generated as global_count;
                `);

                const dailyStmt = env.DB.prepare(`
                    INSERT INTO pdf_stats (tracking_date, user_id, total_generated)
                    VALUES (?1, ?2, 1)
                    ON CONFLICT(tracking_date, user_id) DO UPDATE SET total_generated = total_generated + 1
                    RETURNING total_generated as daily_count;
                `).bind(today, userId);
                
                // Execute atomically
                const results = await env.DB.batch([globalStmt, dailyStmt]);
                
                // Extract counts
                const globalCount = results[0].results[0].global_count;
                const dailyCount = results[1].results[0].daily_count;

                return new Response(JSON.stringify({ success: true, globalCount, dailyCount }), { status: 200, headers: { "Content-Type": "application/json" } });
            } catch (err) {
                console.error("DB error:", err);
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
        }
        
        return env.ASSETS.fetch(request);
    }
}
