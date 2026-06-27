export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        if (request.method === "POST" && url.pathname === "/api/track-pdf") {
            const today = new Date().toISOString().split('T')[0];
            try {
                // If the user didn't name the binding DB, this will throw an error and we'll see a 500
                if (!env.DB) {
                     return new Response(JSON.stringify({ error: "DB binding not found. Did you name the variable 'DB' in settings?" }), { status: 500 });
                }

                const stmt = env.DB.prepare(`
                    INSERT INTO pdf_stats (tracking_date, total_generated)
                    VALUES (?1, 1)
                    ON CONFLICT(tracking_date) DO UPDATE SET total_generated = total_generated + 1;
                `).bind(today);
                await stmt.run();
                return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
            } catch (err) {
                console.error("DB error:", err);
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
        }
        
        // Serve static assets (your Blazor app) for all other routes
        return env.ASSETS.fetch(request);
    }
}
