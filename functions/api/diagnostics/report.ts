const JSON_HEADERS = {
    'Content-Type': 'application/json'
};

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const MAX_BODY_BYTES = 512 * 1024;
const RETENTION_DAYS = 30;
const DAILY_REPORT_LIMIT = 10;

type DiagnosticReportDocument = {
    id: string;
    createdAt: string;
    expiresAt: string;
    app?: unknown;
    client?: unknown;
    summary?: unknown;
    logs?: unknown[];
};

const buildJsonResponse = (payload: unknown, status = 200): Response => {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            ...JSON_HEADERS,
            ...CORS_HEADERS
        }
    });
};

const readString = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : ''
);

const toPositiveInt = (value: unknown, fallback: number): number => {
    const parsed = Math.floor(Number(value));
    return parsed > 0 ? parsed : fallback;
};

const getBucket = (env: any): R2Bucket | null => {
    const candidate = env?.DIAGNOSTIC_REPORTS_R2 || env?.CNB_SYNC_R2;
    if (!candidate || typeof candidate.get !== 'function' || typeof candidate.put !== 'function') {
        return null;
    }
    return candidate as R2Bucket;
};

const getRetentionDays = (env: any): number => Math.min(365, toPositiveInt(env?.DIAGNOSTIC_REPORT_RETENTION_DAYS, RETENTION_DAYS));

const getPrefix = (env: any): string => {
    const raw = readString(env?.DIAGNOSTIC_REPORT_R2_PREFIX) || 'moranjianghu/diagnostics';
    return raw.replace(/^\/+|\/+$/g, '') || 'moranjianghu/diagnostics';
};

const buildReportId = (): string => {
    const random = crypto.getRandomValues(new Uint8Array(12));
    const suffix = Array.from(random).map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `diag_${stamp}_${suffix}`;
};

const buildObjectKey = (env: any, id: string, createdAt?: string): string => {
    const date = new Date(createdAt || Date.now());
    const year = String(date.getUTCFullYear()).padStart(4, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${getPrefix(env)}/${year}/${month}/${day}/${id}.json`;
};

const buildIndexKey = (env: any, id: string): string => `${getPrefix(env)}/index/${id}.json`;

const buildRateLimitKey = (env: any, date: string, reporterKey: string): string => `${getPrefix(env)}/rate/${date}/${reporterKey}.json`;

const sha256Hex = async (value: string): Promise<string> => {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const readRequestJson = async (request: Request): Promise<any> => {
    const contentLength = toPositiveInt(request.headers.get('Content-Length'), 0);
    if (contentLength > MAX_BODY_BYTES) {
        throw new Error('诊断日志太大，请先清空旧日志或筛选后再上报');
    }
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
        throw new Error('诊断日志太大，请先清空旧日志或筛选后再上报');
    }
    return JSON.parse(text);
};

const sanitizeLogs = (logs: unknown): unknown[] => {
    if (!Array.isArray(logs)) return [];
    return logs.slice(0, 200).map((entry) => {
        if (!entry || typeof entry !== 'object') return entry;
        const source = entry as Record<string, unknown>;
        return {
            id: readString(source.id).slice(0, 80),
            level: readString(source.level).slice(0, 20),
            time: readString(source.time).slice(0, 80),
            message: readString(source.message).slice(0, 4000),
            detail: readString(source.detail).slice(0, 12000)
        };
    });
};

const buildReportDocument = (env: any, body: any): DiagnosticReportDocument => {
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + getRetentionDays(env) * 24 * 60 * 60 * 1000).toISOString();
    return {
        id: buildReportId(),
        createdAt,
        expiresAt,
        app: body?.app && typeof body.app === 'object' ? body.app : {},
        client: body?.client && typeof body.client === 'object' ? body.client : {},
        summary: body?.summary && typeof body.summary === 'object' ? body.summary : {},
        logs: sanitizeLogs(body?.logs)
    };
};

const buildReporterKey = async (request: Request, body: any): Promise<string> => {
    const client = body?.client && typeof body.client === 'object' ? body.client : {};
    const deviceId = readString(client.deviceId);
    if (deviceId) return `device-${await sha256Hex(deviceId)}`;
    const ip = readString(request.headers.get('CF-Connecting-IP')) || readString(request.headers.get('X-Forwarded-For')) || 'unknown';
    const ua = readString(request.headers.get('User-Agent'));
    return `fallback-${await sha256Hex(`${ip}\n${ua}`)}`;
};

const enforceDailyLimit = async (request: Request, env: any, body: any): Promise<{ remaining: number }> => {
    const bucket = getBucket(env);
    if (!bucket) return { remaining: DAILY_REPORT_LIMIT };

    const today = new Date().toISOString().slice(0, 10);
    const reporterKey = await buildReporterKey(request, body);
    const key = buildRateLimitKey(env, today, reporterKey);
    const existing = await bucket.get(key);
    const parsed = existing ? await existing.json<{ count?: number }>().catch(() => null) : null;
    const count = Math.max(0, Math.floor(Number(parsed?.count) || 0));
    if (count >= DAILY_REPORT_LIMIT) {
        throw new Error(`今天诊断日志上报次数已达上限（${DAILY_REPORT_LIMIT} 次），请明天再试。`);
    }

    const nextCount = count + 1;
    await bucket.put(key, JSON.stringify({
        date: today,
        count: nextCount,
        updatedAt: new Date().toISOString()
    }), {
        httpMetadata: {
            contentType: 'application/json'
        }
    });

    return {
        remaining: Math.max(0, DAILY_REPORT_LIMIT - nextCount)
    };
};

const cleanupExpiredReports = async (env: any): Promise<void> => {
    const bucket = getBucket(env);
    if (!bucket) return;
    const now = Date.now();
    const prefix = `${getPrefix(env)}/index/`;
    let cursor: string | undefined;
    let checked = 0;

    do {
        const page = await bucket.list({ prefix, cursor, limit: 50 });
        cursor = page.truncated ? page.cursor : undefined;
        for (const object of page.objects) {
            if (checked >= 200) return;
            checked += 1;
            const indexObject = await bucket.get(object.key);
            const index = indexObject ? await indexObject.json<{ key?: string; expiresAt?: string }>().catch(() => null) : null;
            const expiresAt = Date.parse(index?.expiresAt || '');
            if (expiresAt && expiresAt < now) {
                const reportKey = readString(index?.key);
                if (reportKey) await bucket.delete(reportKey).catch(() => undefined);
                await bucket.delete(object.key).catch(() => undefined);
            }
        }
    } while (cursor);
};

const readBearerToken = (request: Request): string => {
    const authHeader = request.headers.get('Authorization')?.trim() || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || '';
};

const findReportById = async (env: any, id: string): Promise<DiagnosticReportDocument | null> => {
    const bucket = getBucket(env);
    if (!bucket) return null;

    const indexObject = await bucket.get(buildIndexKey(env, id));
    if (!indexObject) return null;
    const index = await indexObject.json<{ key?: string; expiresAt?: string }>().catch(() => null);
    const key = readString(index?.key);
    if (!key) return null;

    const reportObject = await bucket.get(key);
    if (!reportObject) return null;
    const report = await reportObject.json<DiagnosticReportDocument>().catch(() => null);
    if (!report) return null;

    if (Date.parse(report.expiresAt || '') < Date.now()) {
        await bucket.delete(key).catch(() => undefined);
        await bucket.delete(buildIndexKey(env, id)).catch(() => undefined);
        return null;
    }

    return report;
};

export async function onRequestOptions(): Promise<Response> {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

export async function onRequestGet({ request, env }: any): Promise<Response> {
    try {
        const url = new URL(request.url);
        const id = readString(url.searchParams.get('id'));
        if (!id) {
            return buildJsonResponse({ error: 'Missing diagnostic report id' }, 400);
        }

        const expectedToken = readString(env?.DIAGNOSTIC_REPORT_READ_TOKEN);
        if (expectedToken && readBearerToken(request) !== expectedToken) {
            return buildJsonResponse({ error: 'Unauthorized diagnostic report read' }, 401);
        }

        const report = await findReportById(env, id);
        if (!report) {
            return buildJsonResponse({ error: 'Diagnostic report not found or expired' }, 404);
        }

        return buildJsonResponse({ ok: true, report });
    } catch (error: any) {
        return buildJsonResponse({ error: error?.message || 'Unknown diagnostic report read error' }, 500);
    }
}

export async function onRequestPost({ request, env, waitUntil }: any): Promise<Response> {
    try {
        const bucket = getBucket(env);
        if (!bucket) {
            return buildJsonResponse({ error: 'Diagnostic R2 bucket is not configured' }, 500);
        }

        const body = await readRequestJson(request).catch((error) => {
            throw new Error(error?.message || 'Invalid diagnostic JSON payload');
        });
        if (!body || typeof body !== 'object') {
            return buildJsonResponse({ error: 'Invalid diagnostic payload' }, 400);
        }

        const rateLimit = await enforceDailyLimit(request, env, body);
        const report = buildReportDocument(env, body);
        const key = buildObjectKey(env, report.id, report.createdAt);
        const indexKey = buildIndexKey(env, report.id);

        await bucket.put(key, JSON.stringify(report, null, 2), {
            httpMetadata: {
                contentType: 'application/json'
            },
            customMetadata: {
                reportId: report.id,
                createdAt: report.createdAt,
                expiresAt: report.expiresAt
            }
        });
        await bucket.put(indexKey, JSON.stringify({ id: report.id, key, createdAt: report.createdAt, expiresAt: report.expiresAt }), {
            httpMetadata: {
                contentType: 'application/json'
            },
            customMetadata: {
                reportId: report.id,
                expiresAt: report.expiresAt
            }
        });

        if (typeof waitUntil === 'function') {
            waitUntil(cleanupExpiredReports(env));
        } else {
            cleanupExpiredReports(env).catch(() => undefined);
        }

        return buildJsonResponse({
            ok: true,
            id: report.id,
            createdAt: report.createdAt,
            expiresAt: report.expiresAt,
            retentionDays: getRetentionDays(env),
            remainingToday: rateLimit.remaining
        });
    } catch (error: any) {
        return buildJsonResponse({ error: error?.message || 'Unknown diagnostic report upload error' }, 500);
    }
}
