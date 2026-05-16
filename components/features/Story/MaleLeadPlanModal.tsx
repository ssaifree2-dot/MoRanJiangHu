import React, { useState } from 'react';
import type { 男主剧情规划结构 } from '../../../models/maleLeadPlan';

interface Props {
    plan?: 男主剧情规划结构;
    isFandomMode?: boolean;
    onClose: () => void;
}

const 取数组 = (value: unknown): string[] => Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const 取状态样式 = (status?: string): string => {
    switch (status) {
        case '可触发':
        case '推进中':
            return 'text-blue-300 border-blue-700/50 bg-blue-950/30';
        case '已登场':
        case '已触发':
        case '已结算':
            return 'text-emerald-300 border-emerald-700/50 bg-emerald-950/30';
        case '待触发':
        case '可推进':
            return 'text-amber-300 border-amber-700/50 bg-amber-950/30';
        default:
            return 'text-gray-300 border-gray-700 bg-black/30';
    }
};

const 数组块: React.FC<{ 标题: string; 内容: string[]; theme?: 'gold' | 'blue' | 'cyan' | 'purple' }> = ({ 标题, 内容, theme = 'blue' }) => {
    const themeColors = {
        gold: 'text-amber-400/80 border-amber-700/30',
        blue: 'text-blue-400/80 border-blue-700/30',
        cyan: 'text-cyan-400/80 border-cyan-700/30',
        purple: 'text-purple-400/80 border-purple-700/30',
    };
    const titleColor = themeColors[theme].split(' ')[0];
    const borderColor = themeColors[theme].split(' ')[1];

    return (
        <div className={`rounded-xl border ${borderColor} bg-black/30 p-4 transition-all hover:bg-black/40`}>
            <div className={`text-[10px] tracking-[0.3em] ${titleColor} mb-2 uppercase`}>{标题}</div>
            {内容.length > 0 ? (
                <div className="space-y-2">
                    {内容.map((item, idx) => (
                        <div key={`${标题}-${idx}`} className={`text-xs text-gray-200 leading-6 border-l-2 ${borderColor} pl-3 py-0.5`}>
                            {item}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-xs text-gray-600 italic">暂无内容</div>
            )}
        </div>
    );
};

const MaleLeadPlanModal: React.FC<Props> = ({ plan, isFandomMode = false, onClose }) => {
    const [tab, setTab] = useState<'maleLeads' | 'events' | 'shots'>('maleLeads');

    const 阶段推进 = Array.isArray(plan?.阶段推进) ? plan.阶段推进 : [];
    const 男主条目 = Array.isArray(plan?.男主条目) ? plan.男主条目 : [];
    const 男主互动事件 = Array.isArray(plan?.男主互动事件) ? plan.男主互动事件 : [];
    const 男主镜头规划 = Array.isArray(plan?.男主镜头规划) ? plan.男主镜头规划 : [];

    const 主阶段 = 阶段推进[0];

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[200] hidden md:flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-ink-black/90 w-full max-w-[1400px] h-[90vh] flex flex-col rounded-3xl border border-blue-900/30 shadow-[0_0_100px_rgba(59,130,246,0.1)] relative overflow-hidden ring-1 ring-white/5">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[url('/assets/images/ui/paper-texture.png')] opacity-[0.03] mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-blue-900/10 to-transparent opacity-30 transform translate-x-1/3 -translate-y-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-cyan-900/10 to-transparent opacity-20 transform -translate-x-1/3 translate-y-1/3"></div>
                </div>

                <header className="h-20 shrink-0 border-b border-blue-900/30 bg-gradient-to-r from-blue-950/40 via-black/40 to-black/40 flex items-center justify-between px-8 relative z-50">
                    <div className="flex items-center gap-6">
                        <div>
                            <div className="text-blue-400 font-serif font-bold text-2xl tracking-[0.4em] drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">蓝颜卷宗</div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-400 font-medium tracking-wider">
                                <span className="text-blue-300/70">{isFandomMode ? '同人男主规划' : '原创男主规划'}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span>当前阶段：<span className="text-gray-200">{主阶段?.阶段名 || '未定'}</span></span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-blue-400 hover:border-blue-400 hover:bg-blue-400/10 transition-all hover:rotate-90 duration-300"
                    >
                        ×
                    </button>
                </header>

                <div className="flex-1 flex overflow-hidden relative z-10">
                    <aside className="w-[340px] shrink-0 bg-black/40 border-r border-blue-900/20 flex flex-col backdrop-blur-md relative">
                        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
                            {!plan ? (
                                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-500 font-serif gap-6">
                                    <div className="text-6xl opacity-20 mb-4">🍃</div>
                                    <span className="text-xl tracking-[0.3em] font-bold text-blue-900/50">蓝颜未定 羁绊未生</span>
                                    <span className="text-xs tracking-wider">当前无男主剧情规划数据。</span>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: '男主条目', count: 男主条目.length, color: 'text-blue-400', border: 'border-blue-900/30' },
                                            { label: '互动事件', count: 男主互动事件.length, color: 'text-amber-400', border: 'border-amber-900/30' },
                                            { label: '镜头规划', count: 男主镜头规划.length, color: 'text-purple-400', border: 'border-purple-900/30' },
                                            { label: '阶段推进', count: 阶段推进.length, color: 'text-cyan-400', border: 'border-cyan-900/30' },
                                        ].map((stat, i) => (
                                            <div key={i} className={`rounded-2xl border ${stat.border} bg-black/40 p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/5 transition-all`}>
                                                <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                                <div className="text-[10px] text-gray-500 tracking-[0.2em] relative z-10">{stat.label}</div>
                                                <div className={`mt-2 text-3xl font-mono ${stat.color} drop-shadow-md relative z-10`}>{stat.count}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="relative">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-px flex-1 bg-gradient-to-r from-blue-900/0 via-blue-900/50 to-blue-900/0"></div>
                                            <div className="text-[10px] tracking-[0.4em] text-blue-300/70 uppercase font-bold">阶段演进</div>
                                            <div className="h-px flex-1 bg-gradient-to-r from-blue-900/0 via-blue-900/50 to-blue-900/0"></div>
                                        </div>
                                        
                                        <div className="space-y-0 relative before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-gradient-to-b before:from-blue-900/50 before:via-blue-900/20 before:to-transparent ml-2">
                                            {阶段推进.length > 0 ? 阶段推进.map((stage: any, idx) => (
                                                <div key={`stage-${idx}`} className="relative pl-10 pb-8 last:pb-0 group">
                                                    <div className={`absolute left-[11px] top-[5px] w-2.5 h-2.5 rounded-full border-2 ${idx === 0 ? 'bg-blue-500 border-blue-200 shadow-[0_0_10px_rgba(59,130,246,0.8)]' : 'bg-black border-blue-900/50 group-hover:border-blue-500/50 transition-colors'}`}></div>
                                                    <div className="rounded-2xl border border-blue-900/20 bg-black/40 p-5 group-hover:bg-blue-950/20 group-hover:border-blue-900/40 transition-all">
                                                        <div className={`text-sm font-serif font-bold ${idx === 0 ? 'text-blue-300' : 'text-gray-300'}`}>{stage?.阶段名 || `阶段 ${idx + 1}`}</div>
                                                        <div className="mt-3 space-y-2">
                                                            <div className="text-xs text-gray-400 leading-relaxed"><span className="text-blue-400/60 mr-2">主推</span>{取数组(stage?.主推男主).join('、') || '暂无'}</div>
                                                            <div className="text-xs text-gray-400 leading-relaxed"><span className="text-amber-400/60 mr-2">目标</span>{取数组(stage?.阶段目标).join('；') || '暂无'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : <div className="pl-10 text-xs text-gray-600 italic">纵有千古，横有八荒，此刻静寂。</div>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </aside>

                    <main className="flex-1 flex flex-col overflow-hidden relative">
                        <div className="shrink-0 flex items-end justify-start px-8 bg-black/40 relative z-20 border-b border-blue-900/20 backdrop-blur-sm pt-4">
                            {[
                                { id: 'maleLeads' as const, label: '知己录', icon: '🍃' },
                                { id: 'events' as const, label: '缘分推演', icon: '✨' },
                                { id: 'shots' as const, label: '掠影集', icon: '🎬' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setTab(item.id)}
                                    className={`px-8 py-4 text-sm font-serif font-bold tracking-[0.2em] transition-all flex items-center gap-3 relative ${
                                        tab === item.id ? 'text-blue-300' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    <span className="opacity-70">{item.icon}</span>
                                    {item.label}
                                    {tab === item.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10 scroll-smooth">
                            {!plan ? null : tab === 'maleLeads' ? (
                                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
                                    {男主条目.length > 0 ? 男主条目.map((item: any, idx) => (
                                        <div key={`${item?.男主姓名 || 'maleLead'}-${idx}`} className="rounded-3xl border border-blue-900/30 bg-gradient-to-br from-black/80 to-blue-950/10 p-6 shadow-xl relative overflow-hidden group hover:border-blue-700/50 transition-all">
                                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-900/20 rounded-full blur-[80px] group-hover:bg-blue-800/30 transition-all pointer-events-none"></div>
                                            
                                            <div className="flex items-start justify-between gap-4 relative z-10 mb-6">
                                                <div>
                                                    <div className="flex items-baseline gap-3">
                                                        <div className="text-3xl font-serif font-bold text-blue-300 drop-shadow-md">{item?.男主姓名 || `角色 ${idx + 1}`}</div>
                                                        <span className="text-xs text-blue-400/60 font-mono tracking-widest">{item?.类型 || '未分类'}</span>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                        <div className="bg-black/50 px-3 py-1.5 rounded-lg border border-gray-800 text-gray-300">当前阶段：<span className="text-blue-200/80">{item?.当前阶段 || '未定'}</span></div>
                                                    </div>
                                                </div>
                                                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border shadow-sm ${取状态样式(item?.当前关系状态)}`}>
                                                    {item?.当前关系状态 || '未定'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                                <数组块 标题="已成立事实" 内容={取数组(item?.已成立事实)} theme="blue" />
                                                <数组块 标题="阶段目标" 内容={取数组(item?.阶段目标)} theme="gold" />
                                                <数组块 标题="推进方式" 内容={取数组(item?.推进方式)} theme="cyan" />
                                                <数组块 标题="允许突破条件" 内容={取数组(item?.允许突破条件)} theme="cyan" />
                                                <div className="md:col-span-2">
                                                    <数组块 标题="阻断因素" 内容={取数组(item?.阻断因素)} theme="blue" />
                                                </div>
                                            </div>
                                        </div>
                                    )) : <div className="col-span-full text-center py-32 text-gray-600 text-lg italic font-serif tracking-widest">知己录中尚无记载。</div>}
                                </div>
                            ) : tab === 'events' ? (
                                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
                                    {男主互动事件.length > 0 ? 男主互动事件.map((item: any, idx) => (
                                        <div key={`${item?.事件名 || 'event'}-${idx}`} className="rounded-3xl border border-amber-900/30 bg-gradient-to-br from-black/80 to-amber-950/10 p-6 shadow-xl relative overflow-hidden group hover:border-amber-700/50 transition-all">
                                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-900/10 rounded-full blur-[80px] group-hover:bg-amber-800/20 transition-all pointer-events-none"></div>
                                            
                                            <div className="flex items-start justify-between gap-4 relative z-10 mb-6">
                                                <div>
                                                    <div className="text-2xl font-serif font-bold text-amber-300 drop-shadow-md">{item?.事件名 || `事件 ${idx + 1}`}</div>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                        <div className="bg-blue-950/30 px-3 py-1.5 rounded-lg border border-blue-900/30 text-blue-300">{item?.男主姓名 || '未知男主'}</div>
                                                        <div className="bg-black/50 px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400">计划触发：{item?.计划触发时间 || '未设定'}</div>
                                                    </div>
                                                </div>
                                                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border shadow-sm ${取状态样式(item?.当前状态)}`}>
                                                    {item?.当前状态 || '待触发'}
                                                </span>
                                            </div>

                                            <div className="mb-6 p-4 rounded-xl bg-black/40 border border-gray-800/50 text-sm text-gray-300 leading-relaxed relative z-10 shadow-inner">
                                                <span className="text-amber-500/50 mr-2">❝</span>
                                                {item?.事件说明 || '暂无说明'}
                                                <span className="text-amber-500/50 ml-2">❞</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                                <数组块 标题="前置条件" 内容={取数组(item?.前置条件)} theme="gold" />
                                                <数组块 标题="触发条件" 内容={取数组(item?.触发条件)} theme="cyan" />
                                                <数组块 标题="成功结果" 内容={取数组(item?.成功结果)} theme="cyan" />
                                                <数组块 标题="失败结果" 内容={取数组(item?.失败结果)} theme="blue" />
                                                <div className="md:col-span-2">
                                                    <数组块 标题="阻断条件" 内容={取数组(item?.阻断条件)} theme="blue" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <数组块
                                                        标题='关联剧情任务'
                                                        theme="purple"
                                                        内容={[`关联剧情任务：${取数组(item?.关联剧情任务).join('；') || '暂无'}`]}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )) : <div className="col-span-full text-center py-32 text-gray-600 text-lg italic font-serif tracking-widest">缘分尚未推演。</div>}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
                                    {男主镜头规划.length > 0 ? 男主镜头规划.map((item: any, idx) => (
                                        <div key={`${item?.镜头标题 || 'shot'}-${idx}`} className="rounded-3xl border border-purple-900/30 bg-gradient-to-br from-black/80 to-purple-950/10 p-6 shadow-xl relative overflow-hidden group hover:border-purple-700/50 transition-all">
                                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-900/10 rounded-full blur-[80px] group-hover:bg-purple-800/20 transition-all pointer-events-none"></div>
                         
