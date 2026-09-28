export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Helper to ensure database tables exist in D1
        const ensureTables = async () => {
            if (!env.DB) return;
            await env.DB.batch([
                env.DB.prepare(`
                    CREATE TABLE IF NOT EXISTS app_settings (
                        key TEXT PRIMARY KEY,
                        value TEXT
                    );
                `),
                env.DB.prepare(`
                    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('field_pin', '521121');
                `),
                env.DB.prepare(`
                    CREATE TABLE IF NOT EXISTS estimates (
                        id TEXT PRIMARY KEY,
                        quote_number INTEGER,
                        client_name TEXT NOT NULL,
                        client_phone TEXT,
                        client_address TEXT,
                        client_email TEXT,
                        linear_subtotal REAL,
                        discount_amount REAL,
                        adjustment_reason TEXT,
                        grand_total REAL NOT NULL,
                        customer_warranty TEXT,
                        project_notes TEXT,
                        photo_count INTEGER DEFAULT 0,
                        quote_payload TEXT,
                        created_at TEXT NOT NULL
                    );
                `)
            ]);
        };
        
        // 1. Existing tracker endpoint
        if (request.method === "POST" && url.pathname === "/api/track-pdf") {
            const today = new Date().toISOString().split('T')[0];
            const userId = url.searchParams.get('userId') || 'unknown';
            
            try {
                if (!env.DB) {
                     return new Response(JSON.stringify({ error: "DB binding not found." }), { status: 500 });
                }

                const globalStmt = env.DB.prepare(`
                    UPDATE global_stats SET total_generated = total_generated + 1 WHERE id = 1 RETURNING total_generated as global_count;
                `);

                const dailyStmt = env.DB.prepare(`
                    INSERT INTO pdf_stats (tracking_date, user_id, total_generated)
                    VALUES (?1, ?2, 1)
                    ON CONFLICT(tracking_date, user_id) DO UPDATE SET total_generated = total_generated + 1
                    RETURNING total_generated as daily_count;
                `).bind(today, userId);
                
                const results = await env.DB.batch([globalStmt, dailyStmt]);
                
                const globalCount = results[0].results[0].global_count;
                const dailyCount = results[1].results[0].daily_count;

                return new Response(JSON.stringify({ success: true, globalCount, dailyCount }), { status: 200, headers: { "Content-Type": "application/json" } });
            } catch (err) {
                console.error("DB error:", err);
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
        }

        // 2. Save Estimate to D1 (background auto-save upon PDF compilation)
        if (request.method === "POST" && url.pathname === "/api/save-estimate") {
            try {
                if (!env.DB) {
                    return new Response(JSON.stringify({ error: "DB binding not found." }), { status: 500 });
                }
                await ensureTables();

                const data = await request.json();
                const id = 'est_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
                const createdAt = new Date().toISOString();
                const photoCount = (data.PhotoNotes || data.photoNotes || []).length;
                const payloadJson = JSON.stringify(data);

                await env.DB.prepare(`
                    INSERT INTO estimates (
                        id, quote_number, client_name, client_phone, client_address, client_email,
                        linear_subtotal, discount_amount, adjustment_reason, grand_total,
                        customer_warranty, project_notes, photo_count, quote_payload, created_at
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15);
                `).bind(
                    id,
                    data.QuoteNumber || null,
                    data.ClientName || data.clientName || 'Unnamed Client',
                    data.ClientPhone || data.clientPhone || '',
                    data.ClientAddress || data.clientAddress || '',
                    data.ClientEmail || data.clientEmail || '',
                    data.LinearSubtotal || data.linearSubtotal || 0,
                    data.DiscountAmount || data.discountAmount || 0,
                    data.AdjustmentReason || data.adjustmentReason || '',
                    data.Total || data.GrandTotal || data.grandTotal || 0,
                    data.CustomerWarranty || data.customerWarranty || '',
                    data.ProjectNotes || data.projectNotes || '',
                    photoCount,
                    payloadJson,
                    createdAt
                ).run();

                return new Response(JSON.stringify({ success: true, id }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            } catch (err) {
                console.error("Save estimate error:", err);
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
        }

        // 3. Auth PIN (Quote Database Gatekeeper)
        if (request.method === "POST" && url.pathname === "/api/auth-pin") {
            try {
                if (!env.DB) {
                    return new Response(JSON.stringify({ error: "DB binding not found." }), { status: 500 });
                }
                await ensureTables();

                const { pin } = await request.json();
                const row = await env.DB.prepare(`SELECT value FROM app_settings WHERE key = 'field_pin'`).first();
                const expectedPin = row ? row.value : '521121';

                if (pin === expectedPin) {
                    const token = 'tok_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
                    return new Response(JSON.stringify({ success: true, token }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                    });
                } else {
                    return new Response(JSON.stringify({ success: false, error: "Incorrect PIN" }), {
                        status: 401,
                        headers: { "Content-Type": "application/json" }
                    });
                }
            } catch (err) {
                console.error("Auth PIN error:", err);
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
        }

        // 4. Update PIN (Mike Self-Service Setup)
        if (request.method === "POST" && url.pathname === "/api/update-pin") {
            try {
                if (!env.DB) {
                    return new Response(JSON.stringify({ error: "DB binding not found." }), { status: 500 });
                }
                await ensureTables();

                const { currentPin, newPin } = await request.json();
                const row = await env.DB.prepare(`SELECT value FROM app_settings WHERE key = 'field_pin'`).first();
                const expectedPin = row ? row.value : '521121';

                if (currentPin !== expectedPin) {
                    return new Response(JSON.stringify({ success: false, error: "Current PIN is incorrect" }), { status: 401, headers: { "Content-Type": "application/json" } });
                }

                if (!newPin || newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
                    return new Response(JSON.stringify({ success: false, error: "New PIN must be exactly 6 digits" }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                await env.DB.prepare(`
                    INSERT INTO app_settings (key, value) VALUES ('field_pin', ?1)
                    ON CONFLICT(key) DO UPDATE SET value = ?1;
                `).bind(newPin).run();

                return new Response(JSON.stringify({ success: true, message: "PIN updated successfully" }), { status: 200, headers: { "Content-Type": "application/json" } });
            } catch (err) {
                console.error("Update PIN error:", err);
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
        }

        // 5. Get Saved Estimates (Quote Database List)
        if (request.method === "GET" && url.pathname === "/api/estimates") {
            try {
                if (!env.DB) {
                    return new Response(JSON.stringify({ error: "DB binding not found." }), { status: 500 });
                }
                await ensureTables();

                const { results } = await env.DB.prepare(`
                    SELECT id, quote_number, client_name, client_phone, client_address, client_email,
                           linear_subtotal, discount_amount, adjustment_reason, grand_total,
                           customer_warranty, project_notes, photo_count, quote_payload, created_at
                    FROM estimates
                    ORDER BY created_at DESC;
                `).all();

                return new Response(JSON.stringify({ success: true, estimates: results }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            } catch (err) {
                console.error("Get estimates error:", err);
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
        }
        
        return env.ASSETS.fetch(request);
    }
}
