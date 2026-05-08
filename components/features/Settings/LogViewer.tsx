import React, { useEffect, useMemo, useState } from 'react';
import {
    clearDiagnosticLogs,
    getDiagnosticLogs,
    subscribeDiagnosticLogs,
    type DiagnosticLogEntry,
    type DiagnosticLogLevel
} from '../../../services/diagnosticLog';
import { getDiagnosticReportQuota, submitDiagnosticReport } from '../../../services/diagnosticReport';

const levelLabels: Record<DiagnosticLogLevel, string> = {
    log: '普通',
    info: '信息',
    warn: '警告',
    error: '错误',
    debug: '调试'
};

const levelClassNames: Record<DiagnosticLogLevel, string> = {
    log: 'border-gray-700 text-gray-300 bg-black/35',
    info: 'border-wuxia-cyan/40 text-wuxia-cyan bg-cyan-950/20',
    warn: 'border-yellow-500/45 text-yellow-300 bg-yellow-950/20',
    error: 'border-red-500/55 text-red-300 bg-red-950/25',
    debug: 'border-purple-400/40 text-purple-200 bg-purple-950/20'
};

const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', { hour12: false });
};

const buildDiagnosticText = (entries: DiagnosticLogEntry[]) => {
    const lines = entries.slice(0, 120).map(entry => [
        `[${formatTime(entry.time)}] [${levelLabels[entry.level]}] ${entry.message}`,
        entry.detail ? entry.detail : ''
    ].filter(Boolean).join('\n'));
    return [
        '墨染江湖运行诊断日志',
        `导出时间：${formatTime(new Date().toISOString())}`,
        `记录数量：${entries.length}`,
        '',
        ...lines
    ].join('\n');
};

const LogViewer: React.FC = () => {
    const [logs, setLogs] = useState<DiagnosticLogEntry[]>(() => getDiagnosticLogs());
    const [query, setQuery] = useState('');
    const [level, setLevel] = useState<DiagnosticLogLevel | 'all'>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [reporting, setReporting] = useState(false);
    const [reportMessage, setReportMessage] = useState('');
    const [quota, setQuota] = useState(() => getDiagnosticReportQuota());

    useEffect(() => subscribeDiagnosticLogs(() => setLogs(getDiagnosticLogs())), []);

    const filteredLogs = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return logs.filter(entry => {
            if (level !== 'all' && entry.level !== level) return false;
            if (!keyword) return true;
            return `${entry.level}\n${entry.message}\n${entry.detail || ''}`.toLowerCase().includes(keyword);
        });
    }, [logs, level, query]);

    const counts = useMemo(() => {
        return logs.reduce<Record<DiagnosticLogLevel, number>>((acc, entry) => {
            acc[entry.level] += 1;
            return acc;
        }, { log: 0, info: 0, warn: 0, error: 0, debug: 0 });
    }, [logs]);

    const handleCopy = async () => {
        const text = buildDiagnosticText(filteredLogs);
        await navigator.clipboard?.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    const handleExport = () => {
        const payload = {
            exportedAt: new Date().toISOString(),
            counts,
            logs: filteredLogs
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `moranjianghu-diagnostic-${Date.now()}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    const handleSubmitReport = async () => {
        setReporting(true);
        setReportMessage('');
        try {
            const result = await submitDiagnosticReport(filteredLogs);
            setQuota(getDiagnosticReportQuota());
            setReportMessage(`上报成功，诊断编号：${result.id}。今日还可上报 ${result.remainingToday} 次，日志将在 ${formatTime(result.expiresAt)} 后自动过期。`);
            await navigator.clipboard?.writeText(result.id).catch(() => undefined);
        } catch (error: any) {
            setQuota(getDiagnosticReportQuota());
            setReportMessage(error?.message || '诊断日志上报失败');
        } finally {
            setReporting(false);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
                <div>
                    <h3 className="text-wuxia-gold font-serif font-bold text-lg">运行日志</h3>
                    <div className="text-[11px] text-gray-500 mt-1">
                        捕获最近 {logs.length} 条浏览器与应用运行记录，用于排查黑屏、模型异常、存档和发布问题。
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleCopy}
                        className="px-3 py-2 text-xs rounded-md border border-wuxia-gold/50 text-wuxia-gold bg-[#332812] hover:border-wuxia-gold/80"
                    >
                        {copied ? '已复制' : '复制诊断'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-3 py-2 text-xs rounded-md border border-sky-500/45 text-sky-200 bg-sky-950/25 hover:border-sky-300/60"
                    >
                        导出 JSON
                    </button>
                    <button
                        onClick={handleSubmitReport}
                        disabled={reporting || filteredLogs.length === 0 || quota.remaining <= 0}
                        className="px-3 py-2 text-xs rounded-md border border-emerald-500/45 text-emerald-200 bg-emerald-950/25 hover:border-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {reporting ? '上报中...' : '上报日志'}
                    </button>
                    <button
                        onClick={clearDiagnosticLogs}
                        className="px-3 py-2 text-xs rounded-md border border-red-900/60 text-red-300 bg-red-950/20 hover:bg-red-900/25"
                    >
                        清空日志
                    </button>
                </div>
            </div>

            <div className="shrink-0 mb-3 rounded-lg border border-emerald-500/20 bg-emerald-950/10 px-3 py-2 text-xs leading-5 text-emerald-100/85">
                每台设备每天最多上报 {quota.limit} 次诊断日志，今天已用 {quota.used} 次，剩余 {quota.remaining} 次。上报内容会保存到云端诊断桶，保留 1 个月后过期。
                {reportMessage && <div className="mt-1 text-wuxia-gold">{reportMessage}</div>}
            </div>

            <div className="shrink-0 grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                {(['error', 'warn', 'info', 'debug', 'log'] as DiagnosticLogLevel[]).map(item => (
                    <button
                        key={item}
                        onClick={() => setLevel(prev => prev === item ? 'all' : item)}
                        className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${levelClassNames[item]} ${level === item ? 'ring-1 ring-wuxia-gold/70' : ''}`}
                    >
                        <div className="font-bold">{levelLabels[item]}</div>
                        <div className="mt-1 font-mono text-base">{counts[item]}</div>
                    </button>
                ))}
            </div>

            <div className="shrink-0 mb-3 flex flex-col md:flex-row gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索日志内容 / 错误 / 接口 / 存档"
                    className="flex-1 bg-black/40 border border-gray-700 p-2.5 text-sm text-white rounded-md outline-none focus:border-wuxia-gold"
                />
                {level !== 'all' && (
                    <button
                        onClick={() => setLevel('all')}
                        className="px-3 py-2 text-xs rounded-md border border-gray-700 text-gray-300 bg-black/35"
                    >
                        显示全部
                    </button>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-black/20 border border-gray-800 rounded-lg p-3 space-y-2">
                {filteredLogs.map(entry => {
                    const expanded = expandedId === entry.id;
                    return (
                        <div key={entry.id} className={`rounded-lg border overflow-hidden ${levelClassNames[entry.level]}`}>
                            <button
                                onClick={() => setExpandedId(prev => prev === entry.id ? null : entry.id)}
                                className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex items-center gap-2">
                                        <span className="shrink-0 rounded border border-current/35 px-1.5 py-0.5 text-[10px]">{levelLabels[entry.level]}</span>
                                        <span className="truncate text-sm text-gray-100">{entry.message}</span>
                                    </div>
                                    <span className="shrink-0 text-[10px] text-gray-500">{formatTime(entry.time)}</span>
                                </div>
                            </button>
                            {expanded && (
                                <div className="border-t border-current/15 px-3 py-3">
                                    <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-300">{entry.detail || entry.message}</pre>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredLogs.length === 0 && (
                    <div className="text-center text-gray-600 py-12">暂无匹配日志</div>
                )}
            </div>
        </div>
    );
};

export default LogViewer;
