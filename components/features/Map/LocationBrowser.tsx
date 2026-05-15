import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 世界数据结构, 环境信息结构 } from '../../../types';
import { 构建地点树, type 地点树节点 } from '../../../utils/locationTree';
import RegionMap from './RegionMap';

interface Props {
    world: 世界数据结构;
    env: 环境信息结构;
    onRegenerateMap?: () => Promise<boolean>;
    compact?: boolean;
    rawResponse?: string;
    socialList?: any[];
}

const 层级标签: Record<string, string> = {
    '寰宇': '银河',
    '大地点': '世界',
    '中地点': '大洲',
    '小地点': '城镇',
    '区地点': '建筑',
    '子地点': '房间',
};

const LocationTreeItem: React.FC<{
    node: 地点树节点;
    selectedId: string;
    playerLocationId: string;
    playerAncestorIds: Set<string>;
    depth: number;
    onSelect: (node: 地点树节点) => void;
}> = ({ node, selectedId, playerLocationId, playerAncestorIds, depth, onSelect }) => {
    if (depth > 30) return null;
    const inPlayerPath = playerAncestorIds.has(node.ID);
    const [expanded, setExpanded] = useState(depth < 2 || inPlayerPath);
    const isSelected = node.ID === selectedId;
    const isPlayerLocation = node.ID === playerLocationId;
    const hasChildren = node.子节点.length > 0;

    return (
        <div>
            <div
                className={`flex items-center gap-1.5 py-1.5 px-2 rounded cursor-pointer transition-colors text-sm
                    ${isSelected ? 'bg-wuxia-gold/10 border border-wuxia-gold/30 text-wuxia-gold' : isPlayerLocation ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'hover:bg-white/5 text-gray-300'}
                `}
                style={{ paddingLeft: `${2 + depth * 12}px` }}
                onClick={() => {
                    if (hasChildren) setExpanded(!expanded);
                    onSelect(node);
                }}
            >
                {hasChildren ? (
                    <span className="text-[10px] text-gray-500 w-3 shrink-0">{expanded ? '▾' : '▸'}</span>
                ) : (
                    <span className="w-3 shrink-0" />
                )}
                <span className="truncate">{node.名称}</span>
                {isPlayerLocation && <span className="text-[8px] text-emerald-400 ml-1 shrink-0">●</span>}
                <span className="text-[10px] text-gray-500 ml-auto shrink-0">{层级标签[node.层级]}</span>
            </div>
            {expanded && hasChildren && (
                <div>
                    {node.子节点.filter(c => c.ID !== node.ID).map(child => (
                        <LocationTreeItem key={child.ID} node={child} selectedId={selectedId} playerLocationId={playerLocationId} playerAncestorIds={playerAncestorIds} depth={depth + 1} onSelect={onSelect} />
                    ))}
                </div>
            )}
        </div>
    );
};

const LocationBrowser: React.FC<Props> = ({ world, env, onRegenerateMap, compact = false, rawResponse = '', socialList = [] }) => {
    const tree = useMemo(() => 构建地点树(world, env), [world]);
    const [selectedNode, setSelectedNode] = useState<地点树节点 | null>(tree.当前节点);
    const [regenerating, setRegenerating] = useState(false);

    // 诊断：检查数据是否到达
    const layerCount = Array.isArray((world as any)?.地图层级) ? (world as any).地图层级.length : 0;

    // 当前所在位置的所有祖先ID，用于自动展开树
    const playerAncestorIds = useMemo(() => {
        const ids = new Set<string>();
        let cursor = tree.当前节点;
        const visited = new Set<string>();
        while (cursor && !visited.has(cursor.ID)) {
            ids.add(cursor.ID);
            visited.add(cursor.ID);
            cursor = cursor.父级ID ? (tree.节点映射.get(cursor.父级ID) || null) : null;
        }
        return ids;
    }, [tree.当前节点]);

    // 仅在 tree 变化时同步选中节点
    const treeVersionRef = useRef(0);
    React.useEffect(() => {
        treeVersionRef.current += 1;
        if (tree.当前节点) setSelectedNode(tree.当前节点);
    }, [tree]);

    const currentViewNode = selectedNode || tree.根节点;
    const childNodes = currentViewNode ? currentViewNode.子节点 : [];

    // 面包屑
    const breadcrumb = useMemo(() => {
        if (!selectedNode) return [];
        const chain: 地点树节点[] = [];
        let cursor: 地点树节点 | null = selectedNode;
        const visited = new Set<string>();
        while (cursor && !visited.has(cursor.ID)) {
            chain.unshift(cursor);
            visited.add(cursor.ID);
            cursor = cursor.父级ID ? (tree.节点映射.get(cursor.父级ID) || null) : null;
        }
        return chain;
    }, [selectedNode, tree]);

    // 选中节点的在场NPC
    const selectedNodeNpcs = useMemo(() => {
        if (!selectedNode || socialList.length === 0) return [];
        const nodeName = (selectedNode.名称 || '').trim().replace(/\s+/g, '').toLowerCase();
        if (!nodeName) return [];
        return socialList.filter((npc: any) => {
            const pos = (npc?.当前位置 || npc?.具体地点 || '').trim().replace(/\s+/g, '').toLowerCase();
            const path = (npc?.位置路径 || '').trim().replace(/\s+/g, '').toLowerCase();
            return pos === nodeName || path.includes(`>${nodeName}>`) || path.includes(`>${nodeName}`) || path.startsWith(nodeName);
        });
    }, [selectedNode, socialList]);

    const rightPanelWidth = compact ? 'min-h-[200px]' : 'w-[320px]';

    return (
        <div className={`${compact ? 'flex flex-col gap-2 overflow-y-auto' : 'flex gap-4'} h-full min-h-0`}>
            {/* 左侧：区域地图 */}
            <div className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-wuxia-gold/20 bg-[#0a0d14] ${compact ? 'h-[40vh] flex-shrink-0' : 'flex-1'}`}>
                {/* 面包屑 */}
                <div className="flex items-start gap-2 border-b border-wuxia-gold/10 bg-black/40 px-4 py-2 shrink-0">
                    {/* 返回上一层 */}
                    {selectedNode?.父级ID && tree.节点映射.has(selectedNode.父级ID) && (
                        <button
                            onClick={() => setSelectedNode(tree.节点映射.get(selectedNode.父级ID!)!)}
                            className="shrink-0 w-6 h-6 rounded border border-gray-700 bg-black/40 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center text-xs transition-colors mt-0.5"
                            title="返回上一层"
                        >
                            ←
                        </button>
                    )}
                    <div className={`flex items-center gap-1 flex-wrap min-w-0 flex-1 leading-tight ${breadcrumb.length > 5 ? 'text-[10px]' : 'text-xs'}`}>
                        {breadcrumb.map((node, i) => (
                            <React.Fragment key={node.ID}>
                                {i > 0 && <span className="text-gray-600 shrink-0">/</span>}
                                <button
                                    onClick={() => setSelectedNode(node)}
                                    className={`tracking-wider px-1 py-0.5 rounded transition-colors whitespace-nowrap
                                        ${i === breadcrumb.length - 1
                                            ? 'text-wuxia-gold font-bold'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {node.名称}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    {onRegenerateMap && (
                        <button
                            disabled={regenerating}
                            onClick={async () => {
                                setRegenerating(true);
                                try { await onRegenerateMap(); } finally { setRegenerating(false); }
                            }}
                            className="shrink-0 rounded-full border border-wuxia-gold/30 bg-wuxia-gold/5 px-3 py-1 text-[10px] text-wuxia-gold hover:bg-wuxia-gold/15 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                            {regenerating ? '解析中…' : '解析地图'}
                        </button>
                    )}
                </div>

                {/* 地图区域 */}
                <div className="flex-1 min-h-0 p-3">
                    <RegionMap
                        nodes={childNodes}
                        currentNodeId={tree.当前节点?.ID || ''}
                        currentLocationName={tree.当前节点?.名称 || ''}
                        onSelect={setSelectedNode}
                        onLocateCurrent={() => {
                            const cur = tree.当前节点;
                            if (!cur) return;
                            const parent = cur.父级ID && tree.节点映射.has(cur.父级ID) ? tree.节点映射.get(cur.父级ID)! : null;
                            if (parent) setSelectedNode(parent);
                            else setSelectedNode(cur);
                        }}
                        level={currentViewNode?.层级 || '大地点'}
                        socialList={socialList}
                        env={env}
                    />
                </div>
            </div>

            {/* 右侧面板：三栏固定高度 */}
            <div className={`${rightPanelWidth} grid gap-3 min-h-0 ${compact ? 'flex-shrink-0' : 'shrink-0'}`} style={{
                height: compact ? 'auto' : '100%',
                gridTemplateRows: compact ? '200px 80px 100px' : '1fr auto auto',
            }}>

                {/* 框一：地点索引 — 最长 */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-wuxia-gold/20 bg-[#0a0d14] min-h-0">
                    <div className="border-b border-wuxia-gold/10 bg-black/40 px-4 py-3 shrink-0">
                        <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">地点索引</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        {tree.根节点 ? (
                            <LocationTreeItem node={tree.根节点} selectedId={selectedNode?.ID || ''} playerLocationId={tree.当前节点?.ID || ''} playerAncestorIds={playerAncestorIds} depth={0} onSelect={setSelectedNode} />
                        ) : (
                            <div className="p-4 text-xs text-gray-500 text-center space-y-2">
                                <div>暂无地点数据</div>
                                <div className="text-[10px] text-gray-600">层级：{layerCount} | 节点：{tree.节点映射.size} | 根：{tree.根节点 ? '有' : '无'}</div>
                                {onRegenerateMap && (
                                    <button disabled={regenerating} onClick={async () => { setRegenerating(true); try { await onRegenerateMap(); } finally { setRegenerating(false); } }}
                                        className="mt-2 px-3 py-1 rounded border border-wuxia-gold/30 bg-wuxia-gold/5 text-[10px] text-wuxia-gold hover:bg-wuxia-gold/10 transition-colors disabled:opacity-50">
                                        {regenerating ? '解析中…' : '点击解析'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 框二：区域介绍 — 中等 */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-wuxia-gold/20 bg-[#0a0d14]">
                    <div className="border-b border-wuxia-gold/10 bg-black/40 px-4 py-3 shrink-0">
                        <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">区域介绍</h3>
                    </div>
                    <div className="p-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: '180px' }}>
                        {selectedNode ? (
                            <>
                                <div className="text-[10px] tracking-widest text-gray-500 mb-1">{层级标签[selectedNode.层级]} · {selectedNode.子节点.length} 个子区域</div>
                                <div className="text-sm font-bold text-gray-200 mb-1">{selectedNode.名称}</div>
                                {selectedNode.描述 ? (
                                    <div className="text-xs text-gray-400 leading-relaxed">{selectedNode.描述}</div>
                                ) : (
                                    <div className="text-xs text-gray-600">暂无描述</div>
                                )}
                                {selectedNodeNpcs.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-white/5">
                                        <div className="text-[10px] text-gray-500 mb-1.5">在场角色</div>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedNodeNpcs.map((npc: any, i: number) => {
                                                const npcColors = ['#d49090','#90b4d4','#90d490','#d4c490','#b490d4','#90d4c4'];
                                                const c = npcColors[Math.abs((npc?.姓名 || npc?.名称 || '').length) % npcColors.length];
                                                return (
                                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                                                        style={{ background: c, color: '#2a1000' }}>
                                                        {npc?.姓名 || npc?.名称 || '?'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-xs text-gray-600">点击地点查看详情</div>
                        )}
                    </div>
                </div>

                {/* 框三：解析日志 — 最矮，固定高度 */}
                <div className="flex flex-col overflow-hidden rounded-2xl border border-wuxia-gold/20 bg-[#0a0d14]">
                    <div className="border-b border-wuxia-gold/10 bg-black/40 px-4 py-3 shrink-0">
                        <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase">
                            解析日志
                            {regenerating && <span className="ml-2 text-wuxia-gold animate-pulse text-[10px]">● 流式输出中…</span>}
                            {!regenerating && rawResponse && <span className="ml-2 text-emerald-400 text-[10px]">● 解析完成</span>}
                        </h3>
                    </div>
                    <div className="overflow-y-auto p-3 custom-scrollbar" style={{ height: compact ? '100px' : '150px' }}>
                        {rawResponse ? (
                            <pre className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-gray-400 font-mono">{rawResponse}</pre>
                        ) : (
                            <div className="text-xs text-gray-600">点击"解析地图"后，AI 的思考过程将在此流式显示。</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LocationBrowser;
