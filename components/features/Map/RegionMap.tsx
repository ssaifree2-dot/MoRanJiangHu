import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { 地点树节点, 地点层级类型 } from '../../../utils/locationTree';

interface Props {
    nodes: 地点树节点[];
    currentNodeId: string;
    currentLocationName: string;
    onSelect: (node: 地点树节点) => void;
    onLocateCurrent: () => void;
    level: 地点层级类型;
    socialList?: any[];
    env?: { 大地点?: string; 中地点?: string; 小地点?: string; 具体地点?: string };
}

const 约束数值 = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const 归一化文本 = (v: unknown): string => String(v || '').trim().replace(/\s+/g, '').toLowerCase();

const 稳定哈希数 = (input: string): number => {
    let h = 2166136261;
    for (let i = 0; i < input.length; i += 1) { h ^= input.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
};

// ─── 等高线 ───

const 生成等高线 = (nodeNames: string[], mapW: number, mapH: number): Array<Array<{ x: number; y: number }>> => {
    const combinedText = nodeNames.join('');
    const hasTerrainHint = ['山', '岭', '峰', '谷', '坡', '崖', '林', '溪', '野', '郊', '荒', '水', '河', '湖', '海', '原', '漠', '渊', '域', '岛', '陆', '泽', '丘'].some(k => combinedText.includes(k));
    const lines: Array<Array<{ x: number; y: number }>> = [];
    const count = hasTerrainHint ? Math.max(4, Math.min(8, Math.floor(mapH / 4))) : Math.max(3, Math.min(5, Math.floor(mapH / 8)));
    for (let li = 0; li < count; li++) {
        const yBase = ((li + 1) / (count + 1)) * mapH;
        const amp = 0.55 + (li % 3) * 0.22;
        const phase = (li + 1) * 0.9;
        const points: Array<{ x: number; y: number }> = [];
        for (let s = 0; s <= 18; s++) {
            const x = (s / 18) * mapW;
            const y = yBase + Math.sin((x / Math.max(1, mapW)) * Math.PI * 2 + phase) * amp + Math.sin((x / Math.max(1, mapW)) * Math.PI * 4 + phase * 0.7) * 0.22;
            points.push({ x: Math.max(0.5, Math.min(mapW - 0.5, x)), y: Math.max(0.5, Math.min(mapH - 0.5, y)) });
        }
        lines.push(points);
    }
    return lines;
};

// ─── 布局计算 ───

interface 布局点 { x: number; y: number; node: 地点树节点; isCurrent: boolean; }

const 计算布局 = (nodes: 地点树节点[], currentNodeId: string, mapW: number, mapH: number, mapPad: number = 4): 布局点[] => {
    if (nodes.length === 0) return [];
    const pad = mapPad;
    const usableW = mapW - pad * 2;
    const usableH = mapH - pad * 2;
    const cols = Math.max(2, Math.min(Math.ceil(Math.sqrt(nodes.length * (usableW / usableH))), 6));
    const rows = Math.ceil(nodes.length / cols);
    const cellW = usableW / cols;
    const cellH = usableH / rows;

    const sorted = [...nodes].sort((a, b) => {
        if (a.ID === currentNodeId) return -1;
        if (b.ID === currentNodeId) return 1;
        return 稳定哈希数(a.名称 + a.ID) - 稳定哈希数(b.名称 + b.ID);
    });

    return sorted.map((node, i) => {
        const hash = 稳定哈希数(node.名称 + node.ID);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const jx = ((hash >> 4) % 20 - 10) / 30 * cellW;
        const jy = ((hash >> 12) % 20 - 10) / 30 * cellH;
        return {
            x: pad + col * cellW + cellW / 2 + jx,
            y: pad + row * cellH + cellH / 2 + jy,
            node,
            isCurrent: node.ID === currentNodeId,
        };
    });
};

// 不同层级使用不同的地图尺寸（pad控制内容距边框的距离）
const 取地图尺寸 = (level: 地点层级类型) => {
    if (level === '寰宇') return { w: 128, h: 96, pad: 10 };
    if (level === '大地点') return { w: 72, h: 54, pad: 6 };
    if (level === '中地点') return { w: 52, h: 40, pad: 8 };
    return { w: 52, h: 40, pad: 4 };
};

const RegionMap: React.FC<Props> = ({ nodes, currentNodeId, currentLocationName, onSelect, onLocateCurrent, level, socialList = [], env }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { w: MAP_W, h: MAP_H, pad: MAP_PAD } = 取地图尺寸(level);

    const [dragMode, setDragMode] = useState(false);
    const [mapZoom, setMapZoom] = useState(1);
    const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
    const [mapFocusPoint, setMapFocusPoint] = useState<{ x: number; y: number } | null>(null);

    const dragStateRef = useRef<{
        pointerId: number; startClientX: number; startClientY: number;
        startPan: { x: number; y: number }; viewBoxW: number; viewBoxH: number; rectW: number; rectH: number;
    } | null>(null);

    useEffect(() => { setMapZoom(1); setMapPan({ x: 0, y: 0 }); setMapFocusPoint(null); }, [nodes, MAP_W, MAP_H]);

    const contourLines = useMemo(() => 生成等高线(nodes.map(n => n.名称), MAP_W, MAP_H), [nodes, MAP_W, MAP_H]);
    const layouts = useMemo(() => 计算布局(nodes, currentNodeId, MAP_W, MAP_H, MAP_PAD), [nodes, currentNodeId, MAP_W, MAP_H, MAP_PAD]);

    const nodeNames = nodes.map(n => n.名称).join('');
    const showWater = ['海', '洋', '湖', '河', '江', '泽', '渊', '水'].some(k => nodeNames.includes(k));
    const showHills = ['山', '岭', '丘', '峰', '崖', '谷', '原', '野', '漠'].some(k => nodeNames.includes(k));

    const MAX_ZOOM = 8;
    const OVERSCAN = MAP_W; // 超边界范围，拖出地图时填充底色

    // ViewBox 计算 — 允许拖出地图边界，模拟无限延伸
    const mapViewBox = useMemo(() => {
        const zoom = 约束数值(mapZoom, 1, MAX_ZOOM);
        const width = MAP_W / zoom;
        const height = MAP_H / zoom;
        const cx = (mapFocusPoint?.x ?? MAP_W / 2) + mapPan.x;
        const cy = (mapFocusPoint?.y ?? MAP_H / 2) + mapPan.y;
        const x = 约束数值(cx - width / 2, -OVERSCAN, MAP_W + OVERSCAN - width);
        const y = 约束数值(cy - height / 2, -OVERSCAN, MAP_H + OVERSCAN - height);
        return { x, y, width, height };
    }, [mapZoom, mapPan, mapFocusPoint, MAP_W, MAP_H]);

    // 滚轮缩放
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setMapZoom(prev => 约束数值(Number((prev + (e.deltaY < 0 ? 0.5 : -0.5)).toFixed(2)), 1, MAX_ZOOM));
    }, []);

    // 拖拽平移
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) return;
        if (!dragMode) return;
        const rect = e.currentTarget.getBoundingClientRect();
        dragStateRef.current = {
            pointerId: e.pointerId, startClientX: e.clientX, startClientY: e.clientY,
            startPan: mapPan, viewBoxW: mapViewBox.width, viewBoxH: mapViewBox.height,
            rectW: Math.max(1, rect.width), rectH: Math.max(1, rect.height),
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    }, [mapPan, mapViewBox, dragMode]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const s = dragStateRef.current;
        if (!s || s.pointerId !== e.pointerId) return;
        const dx = (e.clientX - s.startClientX) / s.rectW * s.viewBoxW;
        const dy = (e.clientY - s.startClientY) / s.rectH * s.viewBoxH;
        setMapFocusPoint(null);
        const maxPanX = MAP_W / 2;
        const maxPanY = MAP_H / 2;
        setMapPan({
            x: 约束数值(s.startPan.x - dx, -maxPanX, maxPanX),
            y: 约束数值(s.startPan.y - dy, -maxPanY, maxPanY),
        });
    }, [MAP_W, MAP_H]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (dragStateRef.current?.pointerId === e.pointerId) {
            dragStateRef.current = null;
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }, []);

    // 定位到当前位置：如果在当前层则直接缩放，否则导航到对应层级
    const handleLocateCurrent = () => {
        const found = layouts.find(l => l.isCurrent);
        if (found) {
            setMapFocusPoint({ x: found.x, y: found.y });
            setMapPan({ x: 0, y: 0 });
            setMapZoom(4);
        } else {
            onLocateCurrent();
        }
    };

    // ─── 层级视觉配置 ───
    const isSpace = level === '寰宇';
    const isWorld = level === '大地点';
    const isContinent = level === '中地点';
    const isTown = level === '小地点';
    const isRoom = level === '子地点' || level === '区地点';
    const bgColor = isSpace ? '#080c18' : isWorld ? '#e8f0e8' : isContinent ? '#f2ead5' : isTown ? '#faf6ee' : isRoom ? '#ede0cc' : '#f5f0e1';
    const borderColor = isSpace ? 'rgba(80,120,200,0.25)' : isWorld ? 'rgba(80,140,100,0.3)' : isContinent ? 'rgba(160,130,80,0.35)' : isTown ? 'rgba(150,120,80,0.3)' : isRoom ? 'rgba(190,160,120,0.35)' : 'rgba(180,150,100,0.3)';
    const gridC = isSpace ? 'rgba(60,100,180,0.18)' : isWorld ? 'rgba(100,160,120,0.2)' : isContinent ? 'rgba(180,150,100,0.15)' : isTown ? 'rgba(180,140,90,0.2)' : isRoom ? 'rgba(200,170,130,0.12)' : 'rgba(180,150,110,0.18)';
    const gridC4 = isSpace ? 'rgba(80,140,220,0.3)' : isWorld ? 'rgba(80,140,100,0.35)' : isContinent ? 'rgba(160,120,60,0.3)' : isTown ? 'rgba(150,100,50,0.4)' : isRoom ? 'rgba(170,130,80,0.3)' : 'rgba(160,120,70,0.35)';
    const ctrC1 = isSpace ? 'rgba(40,80,160,0.2)' : isWorld ? 'rgba(80,140,100,0.15)' : isContinent ? 'rgba(180,130,80,0.2)' : isTown ? 'rgba(170,120,70,0.2)' : isRoom ? 'rgba(180,140,90,0.18)' : 'rgba(160,120,70,0.3)';
    const ctrC2 = isSpace ? 'rgba(50,100,180,0.14)' : 'rgba(180,140,90,0.2)';
    const mFill = isSpace ? 'rgba(180,210,255,0.85)' : 'rgba(140,100,60,0.75)';
    const mStroke = isSpace ? 'rgba(140,180,240,0.7)' : 'rgba(120,80,40,0.6)';
    const mCurFill = isSpace ? 'rgba(255,220,100,0.95)' : '#40c870';
    const mCurStroke = isSpace ? 'rgba(255,240,180,1)' : '#208040';
    const mCurGlow = isSpace ? 'rgba(255,220,100,0.3)' : 'rgba(64,200,112,0.3)';
    const lColor = isSpace ? 'rgba(200,220,255,0.9)' : 'rgba(80,50,20,0.85)';
    const lColorCur = isSpace ? '#fde68a' : '#8b2500';
    const lStroke = isSpace ? 'rgba(0,0,20,0.6)' : 'rgba(255,250,240,0.5)';

    const stars = useMemo(() => {
        if (!isSpace) return [];
        const result: Array<{ x: number; y: number; r: number; o: number }> = [];
        const starRange = MAP_W + OVERSCAN * 2;
        for (let i = 0; i < 200; i++) {
            const h = 稳定哈希数(`star-${i}`);
            result.push({
                x: -OVERSCAN + (h % 1000) / 1000 * starRange,
                y: -OVERSCAN + ((h >> 10) % 1000) / 1000 * (MAP_H + OVERSCAN * 2),
                r: 0.04 + ((h >> 20) % 100) / 400,
                o: 0.3 + ((h >> 16) % 70) / 100,
            });
        }
        return result;
    }, [isSpace, MAP_W, MAP_H, OVERSCAN]);

    const orbits = useMemo(() => {
        if (!isSpace) return [];
        const r: Array<{ rx: number; ry: number }> = [];
        for (let i = 0; i < 4; i++) r.push({ rx: 8 + i * 7, ry: (8 + i * 7) * 0.55 });
        return r;
    }, [isSpace]);

    // 大地点：大陆板块，严格边界 + 不重叠
    const continentBlobs = useMemo(() => {
        if (!isWorld) return [];
        const 大陆色板 = ['#c8d8a0', '#b8c9a8', '#d4c8a8', '#a8c8b8', '#c0d0b0', '#d0c4a0', '#bcc8b4', '#c4d0a8'];
        const margin = 3; // 板块距地图边缘的最小距离
        const sized = layouts.map(l => {
            const hash = 稳定哈希数(l.node.名称);
            const maxR = Math.min(MAP_W, MAP_H) / 2 - margin;
            const size = Math.min(maxR, 5 + (hash % 40) / 10); // 5~9 半径，板块更大
            return { ...l, size };
        }).sort((a, b) => b.size - a.size);

        const placed: Array<{ x: number; y: number; r: number }> = [];
        return sized.map(item => {
            let { x, y } = item;
            const r = item.size;
            // 先确保在边界内
            x = Math.max(margin + r, Math.min(MAP_W - margin - r, x));
            y = Math.max(margin + r, Math.min(MAP_H - margin - r, y));
            // 力导向推开重叠
            for (let attempt = 0; attempt < 80; attempt++) {
                let anyOverlap = false;
                for (const p of placed) {
                    const dist = Math.hypot(p.x - x, p.y - y);
                    const minDist = p.r + r + 1; // 板块间最小间距
                    if (dist < minDist) {
                        anyOverlap = true;
                        const overlap = minDist - dist;
                        const angle = Math.atan2(y - p.y, x - p.x);
                        x += Math.cos(angle) * overlap * 0.5;
                        y += Math.sin(angle) * overlap * 0.5;
                    }
                }
                if (!anyOverlap) break;
                // 推完后夹回边界
                x = Math.max(margin + r, Math.min(MAP_W - margin - r, x));
                y = Math.max(margin + r, Math.min(MAP_H - margin - r, y));
            }
            placed.push({ x, y, r });
            const pts = 20;
            const vertices: Array<{ x: number; y: number }> = [];
            const hash = 稳定哈希数(item.node.名称);
            for (let j = 0; j < pts; j++) {
                const angle = (Math.PI * 2 * j) / pts;
                const rr = r * (0.88 + ((hash >> (j % 16)) % 24) / 100);
                vertices.push({
                    x: Math.max(margin, Math.min(MAP_W - margin, x + Math.cos(angle) * rr)),
                    y: Math.max(margin, Math.min(MAP_H - margin, y + Math.sin(angle) * rr * 0.75)),
                });
            }
            return { vertices, color: 大陆色板[Math.abs(hash) % 大陆色板.length], node: item.node, cx: x, cy: y, isCurrent: item.isCurrent, size: r };
        });
    }, [isWorld, layouts, MAP_W, MAP_H]);

    // 大洲层：驿道路网（最小生成树连接所有城镇）
    const roadNetwork = useMemo(() => {
        if (!isContinent || layouts.length < 2) return [];
        const edges: Array<{ from: number; to: number; dist: number }> = [];
        for (let i = 0; i < layouts.length; i++) {
            for (let j = i + 1; j < layouts.length; j++) {
                edges.push({ from: i, to: j, dist: Math.hypot(layouts[i].x - layouts[j].x, layouts[i].y - layouts[j].y) });
            }
        }
        edges.sort((a, b) => a.dist - b.dist);
        const parent = layouts.map((_, i) => i);
        const find = (x: number): number => parent[x] === x ? x : (parent[x] = find(parent[x]));
        const mst: Array<{ from: number; to: number }> = [];
        for (const e of edges) {
            const rf = find(e.from), rt = find(e.to);
            if (rf !== rt) { parent[rf] = rt; mst.push({ from: e.from, to: e.to }); }
        }
        return mst;
    }, [isContinent, layouts]);

    // 城镇层：网格街区布局（有最低格数，空位预留）
    const townGrid = useMemo(() => {
        if (!isTown || layouts.length === 0) return null;
        const count = layouts.length;
        // 最低 3×2 格，随建筑增多扩展
        const minCols = 3, minRows = 2;
        const cols = Math.max(minCols, Math.ceil(Math.sqrt(count * (MAP_W / MAP_H))));
        const rows = Math.max(minRows, Math.ceil(count / cols));
        const cellW = (MAP_W - 4) / cols;
        const cellH = (MAP_H - 4) / rows;
        const startX = 2;
        const startY = 2;
        // 打乱分配：用名称哈希决定位置，不堆在一起
        const shuffled = [...layouts].sort((a, b) => 稳定哈希数(a.node.名称) - 稳定哈希数(b.node.名称));
        const cells: Array<{ x: number; y: number; w: number; h: number; node: 地点树节点 | null; isCurrent: boolean; colorIdx: number }> = [];
        let placed = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const node = placed < shuffled.length ? shuffled[placed].node : null;
                if (node) placed++;
                cells.push({
                    x: startX + c * cellW + 0.3,
                    y: startY + r * cellH + 0.3,
                    w: cellW - 0.6,
                    h: cellH - 0.6,
                    node,
                    isCurrent: node ? node.ID === currentNodeId : false,
                    colorIdx: node ? 稳定哈希数(node.名称) % 5 : -1,
                });
            }
        }
        const roads: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
        for (let r = 1; r < rows; r++) {
            roads.push({ x1: startX, y1: startY + r * cellH, x2: startX + cols * cellW, y2: startY + r * cellH });
        }
        for (let c = 1; c < cols; c++) {
            roads.push({ x1: startX + c * cellW, y1: startY, x2: startX + c * cellW, y2: startY + rows * cellH });
        }
        return { cells, roads, cols, rows, cellW, cellH, startX, startY };
    }, [isTown, layouts, MAP_W, MAP_H, currentNodeId]);

    // 室内层：子节点优先，否则默认"大厅"
    const roomCards = useMemo(() => {
        if (!isRoom) return [];
        const defaults = ['大厅'];
        const source = layouts.length > 0
            ? layouts.map(l => ({ node: l.node, isCurrent: l.isCurrent }))
            : defaults.map((name, i) => ({
                node: { ID: `room-default-${i}`, 名称: name, 层级: '子地点' as const, 父级ID: '', 描述: '', 子节点: [] },
                isCurrent: false,
            }));
        const cols = Math.min(source.length, 3);
        const rows = Math.ceil(source.length / cols);
        const cardW = (MAP_W - 4) / cols;
        const cardH = Math.min(8, (MAP_H - 4) / rows);
        const startX = (MAP_W - cardW * cols) / 2;
        const startY = (MAP_H - cardH * rows) / 2;
        return source.map((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            return {
                x: startX + col * cardW + 0.5,
                y: startY + row * cardH + 0.5,
                w: cardW - 1,
                h: cardH - 1,
                node: item.node,
                isCurrent: item.node.ID === currentNodeId,
            };
        });
    }, [isRoom, layouts, MAP_W, MAP_H, currentNodeId]);

    // NPC匹配：按玩家当前位置匹配
    const npcAtLocation = useMemo(() => {
        if ((!isTown && !isRoom) || socialList.length === 0) return [];
        const locName = 归一化文本(currentLocationName);
        if (!locName) return [];
        return socialList.filter((npc: any) => {
            const npcPos = 归一化文本(npc?.当前位置 || npc?.具体地点 || npc?.所在地点 || '');
            const npcPath = 归一化文本(npc?.位置路径 || '');
            if (!npcPos && !npcPath) return false;
            return npcPos === locName || npcPath.includes(`>${locName}>`) || npcPath.includes(`>${locName}`) || npcPath.startsWith(locName);
        });
    }, [isTown, isRoom, socialList, currentLocationName]);

    // NPC分配到具体建筑：按NPC当前位置匹配子节点名称
    const npcByNode = useMemo(() => {
        const map = new Map<string, any[]>();
        if ((!isTown && !isRoom) || npcAtLocation.length === 0) return map;
        npcAtLocation.forEach((npc: any) => {
            const npcPos = 归一化文本(npc?.当前位置 || npc?.具体地点 || '');
            for (const node of nodes) {
                const nodeName = 归一化文本(node.名称);
                if (npcPos === nodeName || npcPos.includes(nodeName) || nodeName.includes(npcPos)) {
                    if (!map.has(node.ID)) map.set(node.ID, []);
                    map.get(node.ID)!.push(npc);
                    break;
                }
            }
            if (![...map.values()].some(arr => arr.includes(npc)) && nodes.length > 0) {
                if (!map.has('_unplaced')) map.set('_unplaced', []);
                map.get('_unplaced')!.push(npc);
            }
        });
        return map;
    }, [isTown, isRoom, npcAtLocation, nodes]);

    const markerSize = isSpace ? 3.2 : isWorld ? 0 : isContinent ? 0.5 : isTown ? 0 : isRoom ? 0 : 0.6;
    const hitSize = isWorld ? 4 : isTown ? 0 : isRoom ? 3 : markerSize + 1.5;
    const fontSize = isSpace ? 1.2 : isWorld ? 0.9 : isContinent ? 0.7 : isTown ? 0.7 : isRoom ? 0.95 : (nodes.length > 0 ? Math.max(0.6, Math.min(1.1, MAP_W / (nodes.length * 4 + 8))) : 0.8);

    // 房间层：纯列表卡片面板，无地图样式
    if (isRoom) {
        return (
            <div className="w-full h-full min-h-[400px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {roomCards.map((card) => (
                    <div key={card.node.ID}
                        onClick={() => { if (!card.node.ID.startsWith('room-default-')) onSelect(card.node); }}
                        className={`rounded-lg border px-4 py-3 transition-all ${
                            card.isCurrent
                                ? 'border-wuxia-gold/40 bg-wuxia-gold/5 cursor-pointer'
                                : card.node.ID.startsWith('room-default-')
                                ? 'border-white/5 bg-white/[0.02] cursor-default'
                                : 'border-white/10 bg-white/[0.03] hover:border-wuxia-gold/30 cursor-pointer'
                        }`}>
                        {/* 房间名称行 */}
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-base shrink-0">
                                {card.node.名称.includes('厅') ? '🏛' : card.node.名称.includes('卧') ? '🛏' : card.node.名称.includes('卫') ? '🚿' : card.node.名称.includes('厨') ? '🍳' : '🚪'}
                            </span>
                            <span className={`text-sm font-bold truncate ${card.isCurrent ? 'text-wuxia-gold' : 'text-gray-200'}`}>
                                {card.node.名称}
                            </span>
                            {card.isCurrent && <span className="text-[10px] text-wuxia-gold/60 shrink-0 ml-auto">当前</span>}
                        </div>
                        {/* 房间介绍 */}
                        <div className="text-[11px] text-gray-500 leading-relaxed mb-2">
                            {card.node.描述 || '暂无介绍'}
                        </div>
                        {/* 房间内NPC */}
                        <div className="border-t border-white/5 pt-2">
                            <span className="text-[10px] text-gray-500 mr-2">房间内：</span>
                            {npcAtLocation.length > 0 ? (
                                npcAtLocation.map((npc: any, i: number) => {
                                    const npcColors = ['#d49090','#90b4d4','#90d490','#d4c490','#b490d4','#90d4c4'];
                                    const c = npcColors[Math.abs((npc?.姓名 || npc?.名称 || '').length) % npcColors.length];
                                    return (
                                        <span key={i} className="inline-block text-[10px] px-1.5 py-0.5 rounded font-bold mr-1 mb-1"
                                            style={{ background: c, color: '#2a1000' }}>
                                            {npc?.姓名 || npc?.名称 || '?'}
                                        </span>
                                    );
                                })
                            ) : (
                                <span className="text-[11px] text-gray-600">暂无</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-xl"
            style={{ background: bgColor, border: `1px solid ${borderColor}` }}
            onWheel={handleWheel}
        >
            <svg ref={svgRef}
                className={`absolute inset-0 h-full w-full touch-none ${dragMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                viewBox={`${mapViewBox.x} ${mapViewBox.y} ${mapViewBox.width} ${mapViewBox.height}`}
                preserveAspectRatio="xMidYMid meet"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                {/* 裁剪路径：防止任何元素画出地图 */}
                <defs>
                    <clipPath id="map-clip">
                        <rect x={-OVERSCAN} y={-OVERSCAN} width={MAP_W + OVERSCAN * 2} height={MAP_H + OVERSCAN * 2} />
                    </clipPath>
                </defs>
                <g clipPath="url(#map-clip)">
                {/* 超边界底色：拖出地图时不会看到白边 */}
                <rect x={-OVERSCAN} y={-OVERSCAN} width={MAP_W + OVERSCAN * 2} height={MAP_H + OVERSCAN * 2} fill={bgColor} pointerEvents="none" />
                {isSpace && stars.map((s, i) => <circle key={`st-${i}`} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} pointerEvents="none" />)}
                {isSpace && orbits.map((o, i) => <ellipse key={`ob-${i}`} cx={MAP_W / 2} cy={MAP_H / 2} rx={o.rx} ry={o.ry} fill="none" stroke="rgba(80,140,220,0.15)" strokeWidth={0.08} strokeDasharray={i % 2 === 0 ? 'none' : '0.3 0.6'} pointerEvents="none" />)}
                {/* 世界层级：海洋铺满超边界 */}
                {isWorld && <rect x={-OVERSCAN} y={-OVERSCAN} width={MAP_W + OVERSCAN * 2} height={MAP_H + OVERSCAN * 2} fill="rgba(140,190,210,0.3)" pointerEvents="none" />}
                {!isSpace && !isWorld && showHills && <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="rgba(140,180,140,0.15)" pointerEvents="none" />}
                {!isSpace && !isWorld && showWater && (
                    <path d={`M 0 ${MAP_H * 0.72} C ${MAP_W * 0.18} ${MAP_H * 0.62}, ${MAP_W * 0.32} ${MAP_H * 0.86}, ${MAP_W * 0.5} ${MAP_H * 0.72} S ${MAP_W * 0.82} ${MAP_H * 0.5}, ${MAP_W} ${MAP_H * 0.6} L ${MAP_W} ${MAP_H} L 0 ${MAP_H} Z`}
                        fill="rgba(140,190,210,0.25)" stroke="rgba(100,150,180,0.35)" strokeWidth={0.1} pointerEvents="none" />
                )}
                {Array.from({ length: MAP_W + 1 + OVERSCAN * 2 }).map((_, i) => {
                    const x = i - OVERSCAN;
                    return <line key={`gx-${i}`} x1={x} y1={-OVERSCAN} x2={x} y2={MAP_H + OVERSCAN} stroke={i % 4 === 0 ? gridC4 : gridC} strokeWidth={i % 4 === 0 ? 0.08 : 0.04} pointerEvents="none" />;
                })}
                {Array.from({ length: MAP_H + 1 + OVERSCAN * 2 }).map((_, i) => {
                    const y = i - OVERSCAN;
                    return <line key={`gy-${i}`} x1={-OVERSCAN} y1={y} x2={MAP_W + OVERSCAN} y2={y} stroke={i % 4 === 0 ? gridC4 : gridC} strokeWidth={i % 4 === 0 ? 0.08 : 0.04} pointerEvents="none" />;
                })}
                {!isSpace && !isContinent && !isTown && !isRoom && contourLines.map((pts, i) => (
                    <polyline key={`ctr-${i}`} points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none" stroke={i % 2 === 0 ? ctrC1 : ctrC2} strokeWidth={0.1} strokeDasharray="0.5 0.4" strokeLinecap="round" pointerEvents="none" />
                ))}

                {/* 大洲层：双线古卷边框 */}
                {isContinent && <>
                    <rect x={0.8} y={0.8} width={MAP_W - 1.6} height={MAP_H - 1.6}
                        fill="none" stroke="rgba(140,100,50,0.4)" strokeWidth={0.2} pointerEvents="none" />
                    <rect x={0.4} y={0.4} width={MAP_W - 0.8} height={MAP_H - 0.8}
                        fill="none" stroke="rgba(160,120,60,0.25)" strokeWidth={0.1} pointerEvents="none" />
                </>}
                {/* 大洲层：边缘山脉装饰 */}
                {isContinent && [-0.3, MAP_H + 0.3].map((yy, ri) => {
                    const peaks: Array<{x:number;h:number}> = [];
                    for (let px = 2; px < MAP_W - 2; px += 2.5 + (稳定哈希数(`mt-${ri}-${px}`) % 20) / 10) {
                        peaks.push({ x: px, h: 0.6 + (稳定哈希数(`pk-${ri}-${px}`) % 60) / 30 });
                    }
                    const topY = ri === 0 ? yy - 2 : yy + 2;
                    return <g key={`mtns-${ri}`}>
                        {peaks.map((p, pi) => {
                            if (pi === 0) return null;
                            const prev = peaks[pi - 1];
                            const cy = ri === 0 ? yy - p.h : yy + p.h;
                            if (ri === 0) {
                                return <polygon key={pi}
                                    points={`${prev.x},${yy} ${(prev.x + p.x) / 2},${cy} ${p.x},${yy}`}
                                    fill="rgba(140,120,80,0.2)" stroke="rgba(120,90,50,0.35)" strokeWidth={0.06}
                                    pointerEvents="none" />;
                            }
                            return null;
                        })}
                    </g>;
                })}
                {/* 室内层：纯CSS卡片面板（不在SVG内） */}
                {/* 城镇层：网格街区路网 */}
                {isTown && townGrid && <>
                    {/* 背景地面 */}
                    <rect x={townGrid.startX} y={townGrid.startY}
                        width={townGrid.cols * townGrid.cellW} height={townGrid.rows * townGrid.cellH}
                        fill="rgba(220,210,190,0.3)" stroke="none" pointerEvents="none" />
                    {/* 道路线 */}
                    {townGrid.roads.map((r, i) => (
                        <line key={`tr-${i}`} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
                            stroke="rgba(160,130,90,0.5)" strokeWidth={0.35} strokeLinecap="square" pointerEvents="none" />
                    ))}
                    {/* 空位：虚线框 */}
                    {townGrid.cells.filter(c => !c.node).map((cell, i) => (
                        <rect key={`empty-${i}`} x={cell.x} y={cell.y} width={cell.w} height={cell.h} rx={0.12}
                            fill="rgba(220,210,190,0.2)" stroke="rgba(160,130,90,0.2)" strokeWidth={0.06}
                            strokeDasharray="0.2 0.2" pointerEvents="none" />
                    ))}
                    {/* 建筑方块：多色区分 */}
                    {townGrid.cells.filter(c => c.node).map((cell) => {
                        const bldColors = [
                            'rgba(190,155,120,0.7)', 'rgba(175,148,125,0.68)', 'rgba(185,160,130,0.7)',
                            'rgba(170,140,120,0.68)', 'rgba(180,150,122,0.7)',
                        ];
                        const bldStroke = [
                            'rgba(130,90,55,0.6)', 'rgba(120,85,50,0.6)', 'rgba(125,95,60,0.6)',
                            'rgba(115,80,48,0.6)', 'rgba(128,92,55,0.6)',
                        ];
                        return (
                            <g key={cell.node!.ID} className="cursor-pointer" style={{ outline: 'none' }}>
                                <rect x={cell.x} y={cell.y} width={cell.w} height={cell.h} rx={0.15}
                                    fill={cell.isCurrent ? 'rgba(200,120,40,0.6)' : bldColors[cell.colorIdx]}
                                    stroke={cell.isCurrent ? 'rgba(180,80,20,0.9)' : bldStroke[cell.colorIdx]}
                                    strokeWidth={0.12} pointerEvents="none" />
                                {/* 建筑小屋顶线 */}
                                <line x1={cell.x + 0.15} y1={cell.y + 0.25} x2={cell.x + cell.w - 0.15} y2={cell.y + 0.25}
                                    stroke={cell.isCurrent ? 'rgba(180,80,20,0.4)' : 'rgba(120,80,40,0.25)'}
                                    strokeWidth={0.06} pointerEvents="none" />
                                <rect x={cell.x} y={cell.y} width={cell.w} height={cell.h} rx={0.15}
                                    fill="transparent" style={{ cursor: 'pointer' }}
                                    onClick={() => { onSelect(cell.node!); setMapZoom(1); setMapPan({ x: 0, y: 0 }); setMapFocusPoint(null); }} />
                                {cell.w > 2 && (
                                    <text x={cell.x + cell.w / 2} y={cell.y + cell.h / 2}
                                        textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
                                        fill={cell.isCurrent ? '#6b2000' : 'rgba(50,30,10,0.8)'}
                                        fontSize={Math.min(fontSize, cell.w / (cell.node!.名称.length * 0.55 + 1))}
                                        fontFamily="serif" fontWeight="bold">
                                        {cell.node!.名称}
                                    </text>
                                )}
                                {/* 玩家当前位置：绿色方块标记 */}
                                {cell.isCurrent && (
                                    <rect x={cell.x + cell.w - 0.55} y={cell.y + 0.1} width={0.4} height={0.4} rx={0.06}
                                        fill="#40c870" stroke="#208040" strokeWidth={0.06} pointerEvents="none" />
                                )}
                                {/* NPC标记：粉色圆点（详细列表在右侧面板） */}
                                {npcByNode.has(cell.node!.ID) && (
                                    <circle cx={cell.x + 0.4} cy={cell.y + 0.4} r={0.28}
                                        fill="#f06090" stroke="#c03060" strokeWidth={0.06}
                                        pointerEvents="none" />
                                )}
                            </g>
                        );
                    })}
                </>}
                {/* 大洲层：驿道路网 */}
                {isContinent && roadNetwork.map((e, i) => {
                    const from = layouts[e.from], to = layouts[e.to];
                    return (
                        <g key={`road-${i}`}>
                            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                stroke="rgba(140,110,60,0.5)" strokeWidth={0.3} strokeLinecap="round" pointerEvents="none" />
                            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                stroke="rgba(200,170,120,0.35)" strokeWidth={0.12} strokeDasharray="0.4 0.35" strokeLinecap="round" pointerEvents="none" />
                        </g>
                    );
                })}
                {/* 大地点：大陆板块（圆润多边形，不填满，有碰撞避免） */}
                {isWorld && continentBlobs.map((blob) => (
                    <g key={blob.node.ID} style={{ outline: 'none' }}>
                        <polygon
                            points={blob.vertices.map(v => `${v.x},${v.y}`).join(' ')}
                            fill={blob.color} fillOpacity={0.55}
                            stroke={blob.isCurrent ? 'rgba(180,100,20,0.7)' : 'rgba(100,120,80,0.35)'}
                            strokeWidth={0.15} strokeLinejoin="round"
                            pointerEvents="none"
                        />
                        <circle cx={blob.cx} cy={blob.cy} r={blob.size * 0.8} fill="transparent" style={{ cursor: 'pointer' }}
                            onClick={() => { onSelect(blob.node); setMapZoom(1); setMapPan({ x: 0, y: 0 }); setMapFocusPoint(null); }} />
                        <text x={blob.cx} y={blob.cy}
                            textAnchor="middle" dominantBaseline="middle"
                            fill={blob.isCurrent ? '#7a3a0e' : 'rgba(50,35,15,0.9)'}
                            fontSize={fontSize} fontFamily="serif" fontWeight="bold"
                            stroke="rgba(255,255,255,0.4)" strokeWidth={0.06}
                            pointerEvents="none">
                            {blob.node.名称}
                        </text>
                    </g>
                ))}
                {/* 大洲层：城寨标记 */}
                {isContinent && layouts.map(({ x, y, node, isCurrent }) => (
                    <g key={node.ID} className="cursor-pointer" style={{ outline: 'none' }}>
                        <circle cx={x} cy={y} r={hitSize} fill="transparent" stroke="none" style={{ cursor: 'pointer' }}
                            onClick={() => { onSelect(node); setMapZoom(1); setMapPan({ x: 0, y: 0 }); setMapFocusPoint(null); }} />
                        {/* 城寨方形 */}
                        <rect x={x - markerSize} y={y - markerSize} width={markerSize * 2} height={markerSize * 2}
                            fill={isCurrent ? 'rgba(180,80,20,0.9)' : 'rgba(140,100,50,0.75)'}
                            stroke={isCurrent ? 'rgba(180,80,20,1)' : 'rgba(100,70,30,0.6)'}
                            strokeWidth={0.08} pointerEvents="none" />
                        {isCurrent && <rect x={x - markerSize - 0.2} y={y - markerSize - 0.2} width={markerSize * 2 + 0.4} height={markerSize * 2 + 0.4}
                            fill="none" stroke="rgba(200,80,20,0.4)" strokeWidth={0.1} pointerEvents="none" />}
                        {/* 名称牌匾 */}
                        <rect x={x - node.名称.length * fontSize * 0.35 - 0.3} y={y + markerSize + 0.25}
                            width={node.名称.length * fontSize * 0.7 + 0.6} height={fontSize + 0.4}
                            rx={0.15} fill="rgba(255,250,240,0.55)" stroke="rgba(160,120,70,0.3)"
                            strokeWidth={0.04} pointerEvents="none" />
                        <text x={x} y={y + markerSize + 0.5}
                            textAnchor="middle" dominantBaseline="hanging" pointerEvents="none"
                            fill={isCurrent ? '#7a2e00' : 'rgba(60,35,15,0.85)'}
                            fontSize={fontSize} fontFamily="serif" fontWeight="bold">
                            {node.名称}
                        </text>
                    </g>
                ))}
                {/* 其他层级：地点标记（排除已有独立样式的层级） */}
                {!isWorld && !isContinent && !isTown && layouts.map(({ x, y, node, isCurrent }) => (
                    <g key={node.ID} className="cursor-pointer" style={{ outline: 'none' }}>
                        {/* 隐形大点击区 */}
                        <circle cx={x} cy={y} r={hitSize} fill="transparent" stroke="none" style={{ cursor: 'pointer' }}
                            onClick={() => { onSelect(node); setMapZoom(1); setMapPan({ x: 0, y: 0 }); setMapFocusPoint(null); }} />
                        {isSpace ? (
                            /* 寰宇：圆形星球 */
                            <>
                                <circle cx={x} cy={y} r={markerSize}
                                    fill={isCurrent ? mCurFill : mFill}
                                    stroke={isCurrent ? mCurStroke : mStroke}
                                    strokeWidth={0.15} pointerEvents="none"
                                />
                                {isCurrent && <circle cx={x} cy={y} r={markerSize + 0.6} fill="none" stroke={mCurGlow} strokeWidth={0.15} pointerEvents="none" />}
                            </>
                        ) : (
                            /* 其他层级：菱形标记 */
                            <>
                                <polygon
                                    points={`${x},${y - markerSize} ${x + markerSize},${y} ${x},${y + markerSize} ${x - markerSize},${y}`}
                                    fill={isCurrent ? mCurFill : mFill}
                                    stroke={isCurrent ? mCurStroke : mStroke}
                                    strokeWidth={0.1} pointerEvents="none"
                                />
                                {isCurrent && <circle cx={x} cy={y} r={markerSize + 0.5} fill="none" stroke={mCurGlow} strokeWidth={0.12} pointerEvents="none" />}
                            </>
                        )}
                        <text x={x} y={y + markerSize + 0.6}
                            textAnchor="middle" dominantBaseline="hanging" pointerEvents="none"
                            fill={isCurrent ? lColorCur : lColor}
                            fontSize={fontSize} fontFamily="serif" fontWeight={isSpace ? 'bold' : 'normal'}
                            stroke={lStroke} strokeWidth={0.06}>
                            {node.名称}
                        </text>
                    </g>
                ))}
                </g>
            </svg>

            {/* 工具栏 */}
            <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
                <button onClick={() => setMapZoom(prev => 约束数值(Number((prev + 0.5).toFixed(2)), 1, MAX_ZOOM))}
                    className={`w-7 h-7 rounded-full border text-sm flex items-center justify-center transition-colors ${isSpace ? 'border-sky-700/40 bg-slate-900/80 text-sky-300 hover:bg-sky-900/50' : 'border-amber-800/30 bg-[#faf6ed]/90 text-amber-900 hover:bg-amber-100'}`} title="放大">
                    +
                </button>
                <button onClick={() => setMapZoom(prev => 约束数值(Number((prev - 0.5).toFixed(2)), 1, MAX_ZOOM))}
                    className={`w-7 h-7 rounded-full border text-sm flex items-center justify-center transition-colors ${isSpace ? 'border-sky-700/40 bg-slate-900/80 text-sky-300 hover:bg-sky-900/50' : 'border-amber-800/30 bg-[#faf6ed]/90 text-amber-900 hover:bg-amber-100'}`} title="缩小">
                    −
                </button>
                <button onClick={handleLocateCurrent}
                    className={`w-7 h-7 rounded-full border text-xs flex items-center justify-center transition-colors ${isSpace ? 'border-sky-700/40 bg-slate-900/80 text-sky-300 hover:bg-sky-900/50' : 'border-amber-800/30 bg-[#faf6ed]/90 text-amber-900 hover:bg-amber-100'}`} title={`定位到${currentLocationName || '当前位置'}`}>
                    ⊙
                </button>
                <button onClick={() => { setMapZoom(1); setMapPan({ x: 0, y: 0 }); setMapFocusPoint(null); }}
                    className={`w-7 h-7 rounded-full border text-xs flex items-center justify-center transition-colors ${isSpace ? 'border-sky-700/40 bg-slate-900/80 text-sky-300 hover:bg-sky-900/50' : 'border-amber-800/30 bg-[#faf6ed]/90 text-amber-900 hover:bg-amber-100'}`} title="重置缩放">
                    ⌂
                </button>
                <button onClick={() => setDragMode(!dragMode)}
                    className={`w-7 h-7 rounded-full border text-[10px] flex items-center justify-center transition-colors ${dragMode ? (isSpace ? 'border-sky-400 bg-sky-900/60 text-sky-200' : 'border-amber-600 bg-amber-100 text-amber-800') : (isSpace ? 'border-sky-700/40 bg-slate-900/80 text-sky-300 hover:bg-sky-900/50' : 'border-amber-800/30 bg-[#faf6ed]/90 text-amber-900 hover:bg-amber-100')}`} title={dragMode ? '拖拽中(点击关闭)' : '拖拽地图'}>
                    ✥
                </button>
                <div className={`text-[9px] text-center font-mono ${isSpace ? 'text-sky-400/60' : 'text-amber-900/50'}`}>{mapZoom.toFixed(1)}x</div>
            </div>

            {/* 图例 */}
            <div className={`absolute left-3 bottom-3 z-10 rounded-lg border px-3 py-2 ${isSpace ? 'border-sky-700/30 bg-slate-900/85' : 'border-amber-800/20 bg-[#faf6ed]/85'}`}>
                <div className={`mb-1 text-[10px] font-bold tracking-[0.18em] ${isSpace ? 'text-sky-400/70' : 'text-amber-900/60'}`}>图例</div>
                <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${isSpace ? 'text-sky-400/50' : 'text-amber-900/50'}`}>
                    {isRoom
                        ? null
                        : isSpace
                        ? <span className="inline-flex items-center gap-1.5"><i className="h-0 w-5 border-t border-dashed border-sky-600/40" />星轨</span>
                        : isContinent
                        ? <span className="inline-flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-amber-700/40" />驿道</span>
                        : isTown
                        ? <span className="inline-flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-amber-700/50" />街道</span>
                        : <span className="inline-flex items-center gap-1.5"><i className="h-0 w-5 border-t border-dashed border-amber-800/40" />等高线</span>
                    }
                    {isWorld && <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm border border-blue-600/30 bg-blue-400/30" />海洋</span>}
                    {!isSpace && !isWorld && !isContinent && !isTown && !isRoom && showWater && <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm border border-blue-600/30 bg-blue-400/20" />水体</span>}
                    {!isRoom && <span className="inline-flex items-center gap-1.5"><i className={`h-2.5 w-2.5 ${isSpace ? 'bg-sky-400/50' : isContinent ? 'bg-amber-700/50' : isTown ? 'bg-amber-600/50' : 'bg-amber-700/40'}`} style={isContinent || isTown ? {} : { transform: 'rotate(45deg)' }} />{isSpace ? '星球' : isContinent ? '城寨' : isTown ? '建筑' : '地点'}</span>}
                    {(isTown || isWorld || isContinent) && <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#40c870] border border-[#208040]" />玩家</span>}
                    {isTown && <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#f06090] border border-[#c03060]" />NPC</span>}
                    {isRoom && <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm border border-amber-700/30 bg-amber-100/50" />房间</span>}
                </div>
            </div>
        </div>
    );
};

export default RegionMap;
