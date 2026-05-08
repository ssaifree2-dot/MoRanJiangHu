const JSON_HEADERS = {
    'Content-Type': 'application/json'
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const buildJsonResponse = (payload: unknown, status = 200): Response => (
    new Response(JSON.stringify(payload), {
        status,
        headers: {
            ...JSON_HEADERS,
            ...CORS_HEADERS
        }
    })
);

const readString = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : ''
);

const isAllowedProbeUrl = (value: string, allowAnyUrl: boolean): boolean => {
    try {
        const url = new URL(value);
        if (!/^https?:$/i.test(url.protocol)) return false;
        if (allowAnyUrl) return true;
        return /(^|\.)cnb\.run$/i.test(url.hostname)
            || /^(127\.0\.0\.1|localhost)$/i.test(url.hostname) === false && /(^|\.)cnb\.space$/i.test(url.hostname);
    } catch {
        return false;
    }
};

const buildTargetUrl = (baseUrlRaw: string, pathRaw: string): string => {
    const base = new URL(baseUrlRaw);
    const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
    base.pathname = `${base.pathname.replace(/\/+$/, '')}${path}`;
    base.search = '';
    base.hash = '';
    return base.toString();
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('probe-timeout'), timeoutMs);
    try {
        return await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json,text/plain,*/*'
            }
        });
    } finally {
        clearTimeout(timer);
    }
};

export async function onRequestOptions(): Promise<Response> {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

export async function onRequestGet({ request, env }: any): Promise<Response> {
    const url = new URL(request.url);
    const target = readString(url.searchParams.get('url'));
    const backendType = readString(url.searchParams.get('backendType')) || 'comfyui';
    const allowAnyUrl = readString(env?.CNB_SYNC_ALLOW_ANY_URL).toLowerCase() === 'true';

    if (!target || !isAllowedProbeUrl(target, allowAnyUrl)) {
        return buildJsonResponse({
            ok: false,
            reason: 'invalid_url',
            message: '探测地址无效或不在允许范围内。'
        }, 400);
    }

    const probePath = backendType === 'comfyui' ? '/system_stats' : '/';
    const probeUrl = buildTargetUrl(target.replace(/\/+$/, ''), probePath);
    const startedAt = Date.now();

    try {
        const response = await fetchWithTimeout(probeUrl, 6000);
        const text = await response.text().catch(() => '');
        const headers: Record<string, string> = {};
        ['access-control-allow-origin', 'content-type', 'server'].forEach((key) => {
            const value = response.headers.get(key);
            if (value) headers[key] = value;
        });

        return buildJsonResponse({
            ok: response.ok,
            reachable: true,
            status: response.status,
            statusText: response.statusText,
            elapsedMs: Date.now() - startedAt,
            probeUrl,
            headers,
            bodyPreview: text.slice(0, 300)
        });
    } catch (error: any) {
        const rawMessage = readString(error?.message || error?.name || error) || 'fetch failed';
        const lower = rawMessage.toLowerCase();
        const reason = /abort|timeout/.test(lower)
            ? 'timeout'
            : /ssl|certificate|cert/.test(lower)
                ? 'tls_error'
                : /dns|enotfound|resolve/.test(lower)
                    ? 'dns_error'
                    : 'unreachable';
        return buildJsonResponse({
            ok: false,
            reachable: false,
            reason,
            elapsedMs: Date.now() - startedAt,
            probeUrl,
            error: rawMessage
        });
    }
}
