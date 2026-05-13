import React, { useMemo, useState } from 'react';
import { 聊天记录结构, 记忆系统结构 } from '../../../types';

interface Props {
    history?: 聊天记录结构[];
    memorySystem?: 记忆系统结构;
    onDeleteMemory?: (round: number) => void;
    onRefineMemories?: (rounds: number[]) => Promise<void>;
}

type 回忆展示结构 = {
    名称: string;
    概括: string;
    原文: string;
    回合: number;
    记录时间: string;
    时间戳: string;
};

const 即时短期分隔标记 = '\n<<SHORT_TERM_SYNC>>\n';

const 拆分即时与短期 = (entry: string): { 即时内容: string; 短期摘要: string } => {
    const raw = (entry || '').trim();
    if (!raw) return { 即时内容: '', 短期摘要: '' };
    const splitAt = raw.lastIndexOf(即时短期分隔标记);
    if (splitAt < 0) return { 即时内容: raw, 短期摘要: '' };
    return {
        即时内容: raw.slice(0, splitAt).trim(),
        短期摘要: raw.slice(splitAt + 即时短期分隔标记.length).trim()
    };
};

const 格式化回忆名称 = (round: number): string => `【回忆${String(Math.max(1, round)).padStart(3, '0')}】`;
const 格式化回合显示 = (round: number): string => (round === 1 ? '开场剧情' : `回合：${round}`);

const HistoryViewer: React.FC<Props> = ({ history = [], memorySystem, onDeleteMemory, onRefineMemories }) => {
    const [query, setQuery] = useState('');
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [selectedRounds, setSelectedRounds] = useState<Set<number>>(new Set());
    const [refining, setRefining] = useState(false);

    const allMemories = useMemo<回忆展示结构[]>(() => {
        if (Array.isArray(memorySystem?.回忆档案) && memorySystem!.回忆档案.length > 0) {
            return memorySystem!.回忆档案
                .map((item, idx) => ({
                    名称: typeof item?.名称 === 'string' && item.名称.trim() ? item.名称.trim() : 格式化回忆名称(idx + 1),
                    概括: typeof item?.概括 === 'string' ? item.概括 : '',
                    原文: typeof item?.原文 === 'string' ? item.原文 : '',
                    回合: typeof item?.回合 === 'number' && Number.isFinite(item.回合) ? Math.max(1, Math.floor(item.回合)) : idx + 1,
                    记录时间: typeof item?.记录时间 === 'string' ? item.记录时间 : '未知时间',
                    时间戳: typeof item?.时间戳 === 'string' ? item.时间戳 : (typeof item?.记录时间 === 'string' ? item.记录时间 : '未知时间')
                }))
                .sort((a, b) => b.回合 - a.回合);
        }

        const immediate = Array.isArray(memorySystem?.即时记忆) ? memorySystem!.即时记忆 : [];
        if (immediate.length > 0) {
            return immediate
                .map((raw, idx) => {
                    const { 即时内容, 短期摘要 } = 拆分即时与短期(raw);
                    const round = idx + 1;
                    return {
                        名称: 格式化回忆名称(round),
                        概括: 短期摘要,
                        原文: 即时内容,
                        回合: round,
                        记录时间: '未知时间',
                        时间戳: '未知时间'
                    };
                })
                .filter(item => item.概括.trim() || item.原文.trim())
                .reverse();
        }

        const fallback = history
            .filter(msg => msg.role === 'assistant' && msg.structuredResponse)
            .map((msg, idx) => {
                const summary = (msg.structuredResponse?.shortTerm || '').trim();
                const rawText = Array.isArray(msg.structuredResponse?.logs)
                    ? msg.structuredResponse!.logs.map(l => `${l.sender}：${l.text}`).join('\n')
                    : msg.content;
                const round = idx + 1;
                return {
                    名称: 格式化回忆名称(round),
                    概括: summary,
                    原文: rawText,
                    回合: round,
                    记录时间: msg.gameTime || '未知时间',
                    时间戳: msg.gameTime || '未知时间'
                };
            })
            .filter(item => item.概括.trim() || item.原文.trim())
            .reverse();

        return fallback;
    }, [memorySystem, history]);

    const filteredMemories = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        if (!keyword) return allMemories;
        return allMemories.filter(item => {
            const haystack = `${item.名称}\n${item.概括}\n${item.原文}\n${item.记录时间}`.toLowerCase();
            return haystack.includes(keyword);
        });
    }, [allMemories, query]);

    const toggleSelect = (round: number) => {
        setSelectedRounds(prev => {
            const next = new Set(prev);
            if (next.has(round)) {
                next.delete(round);
            } else {
                next.add(round);
            }
            return next;
        });
    };

    const selectAll = () => {
        const allRounds = new Set(filteredMemories.map(m => m.回合));
        setSelectedRounds(allRounds);
    };

    const deselectAll = () => {
        setSelectedRounds(new Set());
    };

    const handleRefine = async () => {
        if (selectedRounds.size < 2) return;
        const rounds = Array.from(selectedRounds);
        setRefining(true);
        try {
            await onRefineMemories?.(rounds);
            setSelectedRounds(new Set());
        } finally {
            setRefining(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, round: number) => {
        e.stopPropagation();
        if (window.confirm(`确定要删除回合 ${round} 的记忆吗？此操作不可逆！`)) {
            onDeleteMemory?.(round);
        }
    };

    const handleCheckboxClick = (e: React.MouseEvent, round: number) => {
        e.stopPropagation();
        toggleSelect(round);
    };

    const [quickCount, setQuickCount] = useState('');

    const selectOldest = () => {
        const n = parseInt(quickCount, 10);
        if (!n || n <= 0) return;
        const normal = allMemories.filter(m => !m.名称.includes('精炼'));
        const sorted = [...normal].sort((a, b) => a.回合 - b.回合);
        const selected = sorted.slice(0, n).map(m => m.回合);
        setSelectedRounds(new Set(selected));
        setQuickCount('');
    };

    return (
        <div className="h-full flex flex-col animate-fadeIn">
            <h3 className="text-wuxia-gold font-serif font-bold text-lg mb-4 shrink-0">互动历史存档</h3>

            <div className="shrink-0 mb-3">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索 名称 / 概括 / 原文"
                    className="w-full bg-black/40 border border-gray-700 p-2.5 text-sm text-white rounded-md outline-none focus:border-wuxia-gold"
                />
            </div>

            {onRefineMemories && (
                <div className="shrink-0 mb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <button
                                type="button"
                                onClick={selectAll}
                                className="text-wuxia-cyan hover:text-wuxia-gold transition-colors"
                            >
                                全选当前
                            </button>
                            {selectedRounds.size > 0 && (
                                <button
                                    type="button"
                                    onClick={deselectAll}
                                    className="text-red-400/70 hover:text-red-400 transition-colors"
                                >
                                    取消
                                </button>
                            )}
                            <span>
                                已选 {selectedRounds.size} 条
                            </span>
                        </div>
                        <button
                            type="button"
                            disabled={selectedRounds.size < 2 || refining}
                            onClick={handleRefine}
                            className={`px-3 py-1.5 text-xs border rounded transition-colors ${
                                selectedRounds.size >= 2 && !refining
                                    ? 'border-wuxia-gold/60 text-wuxia-gold hover:bg-wuxia-gold/10'
                                    : 'border-gray-700 text-gray-600 cursor-not-allowed'
                            }`}
                        >
                            {refining ? '正在精炼中...' : `AI 精炼总结 (${selectedRounds.size}条)`}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">快速选择最早</span>
                        <input
                            type="number"
                            value={quickCount}
                            onChange={(e) => setQuickCount(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') selectOldest(); }}
                            placeholder="条数"
                            className="w-16 bg-black/40 border border-gray-700 px-2 py-1 text-white rounded text-xs outline-none focus:border-wuxia-gold"
                            min={1}
                        />
                        <span className="text-gray-500">条</span>
                        <button
                            type="button"
                            onClick={selectOldest}
                            disabled={!quickCount}
                            className="px-2 py-1 text-xs border border-gray-600 text-gray-400 rounded hover:border-wuxia-gold/50 hover:text-wuxia-gold transition-colors disabled:opacity-30"
                        >
                            选择
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-black/20 border border-gray-800 rounded-lg p-3 space-y-2">
                {filteredMemories.map((item) => {
                    const key = `${item.名称}-${item.回合}`;
                    const isExpanded = expandedKey === key;
                    const isSelected = selectedRounds.has(item.回合);
                    return (
                        <div key={key} className={`border rounded-lg overflow-hidden transition-colors ${isSelected ? 'border-wuxia-gold/50 bg-wuxia-gold/5' : 'border-gray-800/70 bg-black/35'}`}>
                            <div className="flex items-center">
                                {onRefineMemories && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleCheckboxClick(e, item.回合)}
                                        className={`shrink-0 w-6 h-6 flex items-center justify-center ml-2 rounded border text-xs transition-colors ${
                                            isSelected
                                                ? 'border-wuxia-gold bg-wuxia-gold/20 text-wuxia-gold'
                                                : 'border-gray-600 text-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        {isSelected ? '✓' : ''}
                                    </button>
                                )}
                                <button
                                    onClick={() => setExpandedKey(prev => prev === key ? null : key)}
                                    className={`flex-1 text-left px-3 py-2.5 transition-colors ${isExpanded ? 'bg-wuxia-gold/10' : 'hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className={`font-mono text-xs truncate ${isExpanded ? 'text-wuxia-gold' : 'text-gray-200'}`}>{item.名称}</div>
                                        <div className={`text-[10px] ${isExpanded ? 'text-wuxia-gold' : 'text-gray-500'}`}>{isExpanded ? '收起' : '展开'}</div>
                                    </div>
                                    <div className={`mt-1 text-[11px] truncate ${isExpanded ? 'text-gray-200' : 'text-gray-500'}`}>
                                        {item.概括 || '（无概括）'}
                                    </div>
                                </button>
                            </div>

                            {isExpanded && (
                                <div className="border-t border-gray-800 px-3 py-3 space-y-3">
                                    <div className="text-[11px] text-gray-500">{格式化回合显示(item.回合)}</div>

                                    <div>
                                        <div className="text-xs text-wuxia-cyan mb-1">概括</div>
                                        <div className="text-sm text-gray-300 whitespace-pre-wrap">{item.概括 || '（无概括）'}</div>
                                    </div>

                                    <div className="border-t border-gray-800 pt-3">
                                        <div className="text-xs text-wuxia-cyan mb-1">原文</div>
                                        <div className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed">{item.原文 || '（无原文）'}</div>
                                    </div>

                                    {onDeleteMemory && (
                                        <div className="border-t border-gray-800/50 pt-3 flex justify-end">
                                            <button
                                                onClick={(e) => handleDeleteClick(e, item.回合)}
                                                className="px-3 py-1 text-xs text-red-400 border border-red-400/30 rounded hover:bg-red-400/10 hover:border-red-400/60 transition-colors"
                                            >
                                                删除此记忆
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredMemories.length === 0 && (
                    <div className="text-center text-gray-600 py-10">暂无匹配记录</div>
                )}
            </div>
        </div>
    );
};

export default HistoryViewer;
