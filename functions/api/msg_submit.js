export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        
        const { _csrf: token, client_meta: clientEnv, ux_signals: bhv } = body;

        const ip = request.headers.get('CF-Connecting-IP');
        if (!ip) {
            return new Response(JSON.stringify({ error: 'Direct access not allowed' }), { status: 403 });
        }

        const minDuration = 500; 
        if (bhv.d < minDuration) {
             return new Response(JSON.stringify({ error: 'Too fast' }), { status: 403 });
        }
        
        const totalInteractions = (bhv.m || 0) + (bhv.k || 0) + (bhv.t || 0);
        if (totalInteractions === 0) {
            return new Response(JSON.stringify({ error: 'No interaction detected' }), { status: 403 });
        }

        if (clientEnv.wd === true) { 
             return new Response(JSON.stringify({ error: 'Automation detected' }), { status: 403 });
        }

        const formData = new FormData();
        formData.append('secret', env.TURNSTILE_SECRET);
        formData.append('response', token);
        formData.append('remoteip', ip);

        const turnstileResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            body: formData,
            method: 'POST',
        });
        const outcome = await turnstileResult.json();
        if (!outcome.success) {
            return new Response(JSON.stringify({ error: 'Turnstile Failed' }), { status: 403 });
        }


        const targetKey = 'target_global';


        const content = await env.DB.prepare('SELECT value FROM site_content WHERE key = ?').bind(targetKey).first();
        
        if (!content) {
            return new Response(JSON.stringify({ error: 'Resources Not Found' }), { status: 404 });
        }

        return new Response(JSON.stringify({ 
            status: 'ok',
            r_url: content.value 
        }), { 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 });
    }
}
