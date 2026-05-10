import React from 'react';
import { NPC结构, 角色数据结构, 战斗状态结构 } from '../../../types';
import { IconSwords, IconYinYang } from '../../ui/Icons';
import { 生成战斗可视化数据, 逻辑判断知识库 } from '../../../utils/rulebook';
import { 计算角色总气血 } from '../../../utils/characterVitals';

interface Props {
    character: 角色数据结构;
    battle: 战斗状态结构;
    teammates?: NPC结构[];
    contextText?: string;
    onClose: () => void;
}

type 扩展敌方 = 战斗状态结构['敌方'][number] & {
    当前内力?: number;
    最大内力?: number;
};

const 资源条: React.FC<{
    label: string;
    current: number;
    max: number;
    tone: 'red' | 'cyan' | 'indigo';
    icon?: React.ReactNode;
}> = ({ label, current, max, tone: _tone, icon }) => {
    const safeMax = Math.max(1, Number(max) || 0);
    const safeCur = Math.max(0, Number(current) || 0);
    const pct = Math.max(0, Math.min(100, (safeCur / safeMax) * 100));
    const fillClass = 'bg-gradient-to-r from-wuxia-gold/70 via-wuxia-gold to-wuxia-gold/80 shadow-[0_0_10px_rgba(212,175,55,0.45)]';

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-wuxia-gold/80 font-serif tracking-widest">
                    {icon && <span className="opacity-80">{icon}</span>}
                    {label}
                </div>
                <span className="font-mono text-gray-200">{safeCur} <span className="text-gray-500">/</span> {safeMax}</span>
            </div>
            <div className="h-2 rounded-full border border-white/5 bg-black/60 overflow-hidden shadow-inner">
                <div className={`h-full ${fillClass} transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

const 取数 = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const 计算NPC战斗指标 = (unit: any) => {
    const hpRatio = Math.max(0, Math.min(1, 取数(unit?.当前血量) / Math.max(1, 取数(unit?.最大血量, 1))));
    const spRatio = Math.max(0, Math.min(1, 取数(unit?.当前精力) / Math.max(1, 取数(unit?.最大精力, 1))));
    const baseAttack = 取数(unit?.攻击力 ?? unit?.战斗力);
    const baseDefense = 取数(unit?.防御力);
    const agility = 取数(unit?.敏捷, Math.round(baseAttack * 0.35 + spRatio * 12));
    const inner = 取数(unit?.当前内力);
    const 攻势 = Math.round(baseAttack + inner * 0.08 + spRatio * 10);
    return {
        攻势,
        近战伤害: 攻势,
        远程伤害: Math.max(1, Math.round(攻势 * (/弓|弩|暗器|飞刀|飞剑|远程/.test(`${unit?.技能?.join?.(' ') || ''}${unit?.简介 || ''}`) ? 0.9 : 0.55))),
        守势: Math.round(baseDefense + hpRatio * 8),
        身法: Math.round(agility * 1.2 + spRatio * 16),
        续航: Math.round(hpRatio * 45 + spRatio * 45 + Math.min(10, inner / 10)),
    };
};

const 指标说明 = {
    攻势: '每回合可形成的伤害压力；近战看贴身输出，远程看暗器、弓弩、飞剑等可越位输出。',
    守势: '敌方攻势先扣除守势，剩余部分才更容易打进气血；前排存在时，后排通常不会直接承伤。',
    身法: '影响出手顺序、追击、撤退和移动速度；先手击倒目标时，对方本回合不再反击。',
    续航: '持续作战能力，由气血余量、精力余量、内力余量和消耗压力综合估算；低续航代表容易失速、被迫防守或撤退。',
    目标: '本回合默认攻击目标。敌方会优先压迫我方前排；没有前排时才直指主角。'
};

const 战斗指标条: React.FC<{ label: keyof typeof 指标说明; value: React.ReactNode; tone?: string }> = ({ label, value, tone = 'text-gray-100' }) => (
    <div title={指标说明[label]} className="rounded border border-white/10 bg-black/30 px-2 py-1">
        <div className="text-[9px] tracking-[0.18em] text-gray-500">{label}</div>
        <div className={`mt-0.5 font-mono text-sm ${tone}`}>{value}</div>
    </div>
);

const BattleModal: React.FC<Props> = ({ character, battle, teammates = [], contextText = '', onClose }) => {
    const 敌方列表 = (Array.isArray(battle?.敌方) ? battle.敌方 : []) as 扩展敌方[];
    const 队友列表 = React.useMemo(() => (Array.isArray(teammates) ? teammates : []).filter((npc) => npc?.是否队友 === true), [teammates]);
    const 存活敌人数 = 敌方列表.filter((enemy) => (enemy?.当前血量 || 0) > 0).length;
    const 可视化 = 生成战斗可视化数据(character, battle, contextText);
    const 主角总气血 = React.useMemo(() => 计算角色总气血(character), [character]);

    const 部位列表 = [
        ['头部', character.头部当前血量, character.头部最大血量, character.头部状态],
        ['胸腹', character.胸部当前血量, character.胸部最大血量, character.胸部状态], // 简化合并展示，腹部胸部通常相关联，这里按原数据展示
        ['腹部', character.腹部当前血量, character.腹部最大血量, character.腹部状态],
        ['左手', character.左手当前血量, character.左手最大血量, character.左手状态],
        ['右手', character.右手当前血量, character.右手最大血量, character.右手状态],
        ['左腿', character.左腿当前血量, character.左腿最大血量, character.左腿状态],
        ['右腿', character.右腿当前血量, character.右腿最大血量, character.右腿状态],
    ] as const;

    const 合并展示部位 = [
        { label: '首', cur: character.头部当前血量, max: character.头部最大血量, status: character.头部状态 },
        { label: '胸', cur: character.胸部当前血量, max: character.胸部最大血量, status: character.胸部状态 },
        { label: '腹', cur: character.腹部当前血量, max: character.腹部最大血量, status: character.腹部状态 },
        { label: '臂', cur: (character.左手当前血量 || 0) + (character.右手当前血量 || 0), max: (character.左手最大血量 || 0) + (character.右手最大血量 || 0), status: character.右手状态 !== '正常' ? character.右手状态 : character.左手状态 },
        { label: '腿', cur: (character.左腿当前血量 || 0) + (character.右腿当前血量 || 0), max: (character.左腿最大血量 || 0) + (character.右腿最大血量 || 0), status: character.右腿状态 !== '正常' ? character.右腿状态 : character.左腿状态 },
    ];

    const 玩家总血量上限 = 部位列表.reduce((sum, [, , max]) => sum + Math.max(0, Number(max) || 0), 0);
    const 玩家总血量当前 = 部位列表.reduce((sum, [, cur]) => sum + Math.max(0, Number(cur) || 0), 0);
    const 境界值 = Math.max(1, Number(character.境界层级) || 1);
    const 玩家境界展示 = (character.境界 || '').trim() || `境界值 ${境界值}`;
    const 首个存活敌方 = 敌方列表.find((enemy) => (enemy?.当前血量 || 0) > 0);
    const 前排队友 = 队友列表.find((npc) => (npc?.当前血量 || 0) > 0);
    const 敌方默认目标 = 前排队友?.姓名 || character.姓名 || '主角';
    const 玩家远程伤害 = Math.max(1, Math.round(可视化.玩家.攻势 * 0.55));

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[210] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-ink-black/95 w-full max-w-7xl max-h-[90vh] h-[90vh] flex flex-col rounded-2xl border border-wuxia-gold/20 shadow-[0_0_80px_rgba(0,0,0,0.9)] shadow-wuxia-gold/10 relative overflow-hidden">
                
                {/* 装饰类背景层 */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-ink-wash/5 bg-cover bg-center opacity-30 mix-blend-luminosity filter blur-sm"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-red-900/5 via-transparent to-black"></div>
                </div>

                {/* 顶栏 */}
                <div className="h-14 shrink-0 border-b border-wuxia-gold/10 bg-gradient-to-r from-black/80 to-black/40 flex items-center justify-between px-6 relative z-50">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.8)] ${battle?.是否战斗中 ? 'bg-red-500' : 'bg-wuxia-gold'}`}></div>
                        <h3 className="text-wuxia-gold font-serif font-bold text-xl tracking-[0.4em] drop-shadow-md">
                            战斗局势
                            <span className="text-[10px] text-wuxia-gold/50 ml-2 font-mono tracking-widest border border-wuxia-gold/20 px-2 py-0.5 rounded-full">COMBAT</span>
                        </h3>
                    </div>

                    <div className="flex items-center gap-6">
                        <span className={`text-xs px-4 py-1.5 rounded-full border tracking-widest font-serif shadow-inner ${
                            battle?.是否战斗中
                                ? 'border-red-900/50 text-red-300 bg-red-950/40 shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                                : 'border-emerald-900/50 text-emerald-300 bg-emerald-950/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        }`}>
                            {battle?.是否战斗中 ? `刀剑无眼 · 敌兵 ${存活敌人数} 名` : '休战整顿'}
                        </span>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-400 hover:bg-red-400/10 transition-all hover:rotate-90"
                            title="关闭"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 主体内容 */}
                <div className="flex-1 min-h-0 flex flex-col relative z-10">
                    {/* 敌方单位列表（全宽版） */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative">
                        <div className="mb-4 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
                            <section className="rounded-xl border border-wuxia-gold/20 bg-black/35 p-4">
                                <div className="mb-3 text-xs font-bold tracking-[0.22em] text-wuxia-gold/80">统一判定摘要</div>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div title={指标说明.攻势} className="rounded border border-red-500/20 bg-red-950/20 px-3 py-2"><div className="text-red-200">攻势</div><div className="font-mono text-lg text-red-100">{可视化.玩家.攻势}</div></div>
                                    <div title={指标说明.守势} className="rounded border border-sky-500/20 bg-sky-950/20 px-3 py-2"><div className="text-sky-200">守势</div><div className="font-mono text-lg text-sky-100">{可视化.玩家.守势}</div></div>
                                    <div title={指标说明.身法} className="rounded border border-emerald-500/20 bg-emerald-950/20 px-3 py-2"><div className="text-emerald-200">身法</div><div className="font-mono text-lg text-emerald-100">{可视化.玩家.身法}</div></div>
                                    <div title={指标说明.续航} className="rounded border border-amber-500/20 bg-amber-950/20 px-3 py-2"><div className="text-amber-200">续航</div><div className="font-mono text-lg text-amber-100">{可视化.玩家.续航}</div></div>
                                </div>
                                <div className="mt-3 grid gap-2 md:grid-cols-2">
                                    {可视化.阶段.map((stage) => (
                                        <div key={stage.名称} className="rounded border border-white/8 bg-black/25 px-3 py-2">
                                            <div className="text-xs font-semibold text-wuxia-gold">{stage.名称}</div>
                                            <div className="mt-1 text-xs leading-5 text-gray-200">{stage.描述}</div>
                                            <div className="mt-1 text-[10px] leading-4 text-gray-500">{stage.依据}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            <section className="rounded-xl border border-white/10 bg-black/30 p-4">
                                <div className="mb-3 text-xs font-bold tracking-[0.22em] text-gray-300">规则来源</div>
                                <div className="space-y-2">
                                    {逻辑判断知识库.slice(2, 5).map((rule) => (
                                        <div key={rule.名称} className="rounded border border-white/8 bg-black/25 px-3 py-2 text-xs">
                                            <div className="font-semibold text-gray-100">{rule.名称}</div>
                                            <div className="mt-1 leading-5 text-gray-400">{rule.说明}</div>
                                            <div className="mt-1 font-mono text-[10px] text-wuxia-gold/70">{rule.公式}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        <div className="mb-4 grid gap-4 xl:grid-cols-2">
                            <section className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="text-xs font-bold tracking-[0.22em] text-emerald-200">我方队伍</div>
                                    <div className="text-[11px] text-emerald-100/65">含主角与已入队成员</div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="rounded-lg border border-emerald-400/20 bg-black/35 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="font-serif text-base font-bold text-wuxia-gold">{character.姓名 || '主角'}</div>
                                            <div className="text-[11px] text-gray-400">{character.境界 || '未明境界'}</div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                                            <div className="rounded border border-red-500/20 bg-red-950/20 px-2 py-1 text-red-100">气血 <b>{主角总气血.当前}/{主角总气血.最大}</b></div>
                                            <div className="rounded border border-cyan-500/20 bg-cyan-950/20 px-2 py-1 text-cyan-100">精力 <b>{character.当前精力}/{character.最大精力}</b></div>
                                            <div className="rounded border border-indigo-500/20 bg-indigo-950/20 px-2 py-1 text-indigo-100">内力 <b>{character.当前内力}/{character.最大内力}</b></div>
                                            <div className="rounded border border-white/10 bg-black/25 px-2 py-1 text-gray-200">力 {character.力量}</div>
                                            <div className="rounded border border-white/10 bg-black/25 px-2 py-1 text-gray-200">敏 {character.敏捷}</div>
                                            <div className="rounded border border-white/10 bg-black/25 px-2 py-1 text-gray-200">体 {character.体质}</div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                            <战斗指标条 label="攻势" value={`${可视化.玩家.攻势} / 近${可视化.玩家.攻势} 远${玩家远程伤害}`} tone="text-red-100" />
                                            <战斗指标条 label="守势" value={可视化.玩家.守势} tone="text-sky-100" />
                                            <战斗指标条 label="身法" value={可视化.玩家.身法} tone="text-emerald-100" />
                                            <战斗指标条 label="续航" value={可视化.玩家.续航} tone="text-amber-100" />
                                            <div title={指标说明.目标} className="col-span-2 rounded border border-wuxia-gold/20 bg-wuxia-gold/10 px-2 py-1 text-wuxia-gold">目标：{首个存活敌方?.名字 || '无'}</div>
                                        </div>
                                    </div>
                                    {队友列表.map((npc, index) => {
                                        const 指标 = 计算NPC战斗指标(npc);
                                        return (
                                        <div key={npc.id || `${npc.姓名}-${index}`} className="rounded-lg border border-emerald-400/15 bg-black/30 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="font-serif text-sm font-bold text-emerald-100">{npc.姓名 || `队友${index + 1}`}</div>
                                                <div className="text-[10px] text-gray-500">{npc.境界 || '未明'}</div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-200">
                                                <div>气血 {npc.当前血量 || 0}/{npc.最大血量 || 0}</div>
                                                <div>精力 {npc.当前精力 || 0}/{npc.最大精力 || 0}</div>
                                                <div>攻击 {npc.攻击力 || 0}</div>
                                                <div>防御 {npc.防御力 || 0}</div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                                <战斗指标条 label="攻势" value={`${指标.攻势} / 近${指标.近战伤害} 远${指标.远程伤害}`} tone="text-red-100" />
                                                <战斗指标条 label="守势" value={指标.守势} tone="text-sky-100" />
                                                <战斗指标条 label="身法" value={指标.身法} tone="text-emerald-100" />
                                                <战斗指标条 label="续航" value={指标.续航} tone="text-amber-100" />
                                                <div title={指标说明.目标} className="col-span-2 rounded border border-wuxia-gold/20 bg-wuxia-gold/10 px-2 py-1 text-wuxia-gold">目标：{首个存活敌方?.名字 || '无'}</div>
                                            </div>
                                        </div>
                                    );})}
                                </div>
                            </section>
                            <section className="rounded-xl border border-red-500/20 bg-red-950/10 p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="text-xs font-bold tracking-[0.22em] text-red-200">敌方阵列</div>
                                    <div className="text-[11px] text-red-100/65">存活 {存活敌人数} / {敌方列表.length}</div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {敌方列表.length > 0 ? 敌方列表.map((enemy, index) => {
                                        const 指标 = 可视化.敌方[index] || 计算NPC战斗指标(enemy);
                                        const npc指标 = 计算NPC战斗指标(enemy);
                                        return (
                                        <div key={`${enemy?.名字 || 'enemy'}-${index}-summary`} className="rounded-lg border border-red-400/15 bg-black/30 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="font-serif text-sm font-bold text-red-100">{enemy.名字 || `敌人${index + 1}`}</div>
                                                <div className="text-[10px] text-gray-500">{enemy.境界 || '未明'}</div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-200">
                                                <div>气血 {enemy.当前血量 || 0}/{enemy.最大血量 || 0}</div>
                                                <div>精力 {enemy.当前精力 || 0}/{enemy.最大精力 || 0}</div>
                                                <div>攻击 {enemy.战斗力 || 0}</div>
                                                <div>防御 {enemy.防御力 || 0}</div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                                <战斗指标条 label="攻势" value={`${指标.攻势} / 近${指标.攻势} 远${npc指标.远程伤害}`} tone="text-red-100" />
                                                <战斗指标条 label="守势" value={指标.守势} tone="text-sky-100" />
                                                <战斗指标条 label="身法" value={npc指标.身法} tone="text-emerald-100" />
                                                <战斗指标条 label="续航" value={npc指标.续航} tone="text-amber-100" />
                                                <div title={指标说明.目标} className="col-span-2 rounded border border-red-500/25 bg-red-950/20 px-2 py-1 text-red-100">目标：{敌方默认目标}</div>
                                            </div>
                                        </div>
                                    );}) : <div className="rounded border border-dashed border-red-400/20 p-6 text-center text-sm text-red-100/45">暂无敌方</div>}
                                </div>
                            </section>
                        </div>
                        {contextText.trim() && (
                            <div className="mb-4 rounded-xl border border-wuxia-gold/20 bg-black/35 p-4">
                                <div className="mb-2 text-xs font-bold tracking-[0.22em] text-wuxia-gold/80">本回合战斗变化</div>
                                <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-gray-200">{contextText.trim()}</div>
                            </div>
                        )}
                        {敌方列表.length === 0 ? (
                            <div className="h-full rounded-2xl border border-dashed border-wuxia-gold/20 bg-black/20 flex flex-col items-center justify-center text-wuxia-gold/40 gap-4 font-serif">
                                <IconYinYang size={64} className="opacity-30 drop-shadow-lg" />
                                <span className="text-xl tracking-widest">四海升平，并无强压</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
                                {敌方列表.map((enemy, idx) => {
                                    const hpCur = Math.max(0, enemy?.当前血量 || 0);
                                    const hpMax = Math.max(1, enemy?.最大血量 || 1);
                                    const spCur = Math.max(0, enemy?.当前精力 || 0);
                                    const spMax = Math.max(1, enemy?.最大精力 || 1);
                                    const qiCur = Math.max(0, enemy?.当前内力 || 0);
                                    const qiMax = Math.max(1, enemy?.最大内力 || Math.max(qiCur, 1));
                                    const 已失能 = hpCur <= 0;
                                    const enemyViz = 可视化.敌方[idx];

                                    return (
                                        <div key={`${enemy?.名字 || 'enemy'}-${idx}`} className={`relative rounded-xl border p-5 overflow-hidden group transition-all duration-300 ${
                                            已失能 
                                                ? 'border-gray-800 bg-black/40 opacity-50 grayscale scale-[0.98]' 
                                                : 'border-red-900/30 bg-gradient-to-br from-red-950/20 to-black hover:border-red-700/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.1)]'
                                        }`}>
                                            {/* 背景血迹装饰 */}
                                            {!已失能 && <div className="absolute -right-4 -top-4 text-7xl text-red-500 opacity-[0.03] rotate-12 pointer-events-none font-serif">杀</div>}
                                            
                                            <div className="flex items-start justify-between gap-4 relative z-10">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-lg text-red-100 font-serif font-bold flex items-center gap-2 truncate drop-shadow-sm">
                                                        <IconSwords size={16} className={已失能 ? 'text-gray-500' : 'text-red-400'} />
                                                        {enemy?.名字 || `无名游卒 ${idx + 1}`}
                                                    </div>
                                                    <div className="text-[11px] text-red-300/70 mt-1.5 flex items-center gap-2">
                                                        <span className="border border-red-900/50 bg-red-950/50 px-2 py-0.5 rounded font-serif shadow-sm tracking-wider">
                                                            {enemy?.境界 || '未明修身'}
                                                        </span>
                                                        {已失能 && <span className="text-gray-400 border border-gray-700 bg-gray-900 px-2 py-0.5 rounded tracking-widest">失能/败北</span>}
                                                    </div>
                                                    {enemy?.简介 && <div className="text-[11px] text-gray-400 mt-3 leading-relaxed border-l-2 border-red-900/40 pl-2 line-clamp-2 italic">
                                                        {enemy.简介}
                                                    </div>}
                                                </div>
                                                
                                                <div className="grid grid-cols-1 gap-2 text-[10px] font-mono shrink-0">
                                                    <div className="bg-black/50 border border-red-900/30 rounded px-2.5 py-1.5 text-red-300 flex justify-between gap-3 shadow-inner">
                                                        <span>威</span> <strong>{enemy?.战斗力 || 0}</strong>
                                                    </div>
                                                    <div className="bg-black/50 border border-blue-900/30 rounded px-2.5 py-1.5 text-blue-300 flex justify-between gap-3 shadow-inner">
                                                        <span>护</span> <strong>{enemy?.防御力 || 0}</strong>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 space-y-2.5 relative z-10">
                                                <资源条 label="气血" current={hpCur} max={hpMax} tone="red" />
                                                <资源条 label="精力" current={spCur} max={spMax} tone="cyan" />
                                                {(enemy?.最大内力 !== undefined || enemy?.当前内力 !== undefined) && (
                                                    <资源条 label="内力" current={qiCur} max={qiMax} tone="indigo" />
                                                )}
                                            </div>

                                                 <div className="mt-4 pt-3 border-t border-white/5 relative z-10">
                                                {enemyViz ? (
                                                    <div className="mb-3 rounded-lg border border-amber-400/15 bg-amber-950/10 px-3 py-2 text-[11px] leading-5 text-amber-50/80">
                                                        <div className="mb-1 flex items-center justify-between">
                                                            <span className="font-bold text-amber-200">态势：{enemyViz.威胁}</span>
                                                            <span className="font-mono text-amber-100">攻 {enemyViz.攻势} / 守 {enemyViz.守势}</span>
                                                        </div>
                                                        {enemyViz.判定}
                                                    </div>
                                                ) : null}
                                                <div className="text-[10px] text-red-500/70 tracking-[0.2em] font-serif mb-2 flex items-center gap-1.5">
                                                    <span className="w-1 h-3 bg-red-900/80 rounded-full"></span> 功法路数
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Array.isArray(enemy?.技能) && enemy.技能.length > 0 ? (
                                                        enemy.技能.map((skill) => (
                                                            <span key={skill} className="text-[10px] px-2 py-0.5 rounded border border-red-900/30 bg-red-950/20 text-gray-300 shadow-sm font-serif">
                                                                {skill}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-gray-600 italic">平平无奇，无招亦无式</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BattleModal;
