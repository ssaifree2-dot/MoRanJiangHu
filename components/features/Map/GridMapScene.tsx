import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 世界数据结构 } from '../../../models/world';
import { 环境信息结构 } from '../../../models/environment';
import {
    构建地图空间场景,
    补齐世界地图空间字段,
    归一化地图文本,
} from '../../../utils/mapSpatial';

interface Props {
    world: 世界数据结构;
    env: 环境信息结构;
    socialList?: any[];
    debugEnabled?: boolean;
    compact?: boolean;
    onOpenPerson?: (person: any) => void;
}

type 选中对象类型 =
    | { id: string; kind: 'building'; data: any }
    | { id: string; kind: 'road'; data: any }
    | { id: string; kind: 'person'; data: any }
    | null;

const 取文本 = (value: unknown, fallback = '') => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || fallback;
};

const 四角转点串 = (quad: Array<{ x: number; y: number }>) => (
    quad.map((point) => `${point.x},${point.y}`).join(' ')
);

const 点位文本 = (point: { x: number; y: number }) => `[${point.x.toFixed(1)}, ${point.y.toFixed(1)}]`;

const 路径文本 = (points: Array<{ x: number; y: number }>) => (
    points.map((point) => 点位文本(point)).join(' -> ')
);

const 计算中心 = (quad: Array<{ x: number; y: number }>) => ({
    x: quad.reduce((sum, point) => sum + point.x, 0) / quad.length,
    y: quad.reduce((sum, point) => sum + point.y, 0) / quad.length,
});

const 约束数值 = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const 扩展边界 = (
    bounds: { minX: number; minY: number; maxX: number; maxY: number } | null,
    point?: { x: number; y: number }
) => {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return bounds;
    if (!bounds) return { minX: point.x, minY: point.y, maxX: point.x, maxY: point.y };
    return {
        minX: Math.min(bounds.minX, point.x),
        minY: Math.min(bounds.minY, point.y),
        maxX: Math.max(bounds.maxX, point.x),
        maxY: Math.max(bounds.maxY, point.y),
    };
};

const 生成等高线 = (
    layer: any,
    buildings: any[],
    mapWidth: number,
    mapHeight: number
): Array<Array<{ x: number; y: number }>> => {
    const layerText = 归一化地图文本(`${layer?.名称 || ''}${layer?.描述 || ''}`);
    const shouldShowTerrain = buildings.length === 0 || ['山', '岭', '峰', '谷', '坡', '崖', '林', '溪', '野', '郊', '荒'].some((key) => layerText.includes(key));
    if (!shouldShowTerrain) return [];

    const lines: Array<Array<{ x: number; y: number }>> = [];
    const lineCount = Math.max(4, Math.min(8, Math.floor(mapHeight / 4)));
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
        const yBase = ((lineIndex + 1) / (lineCount + 1)) * mapHeight;
        const amplitude = 0.55 + (lineIndex % 3) * 0.22;
        const phase = (lineIndex + 1) * 0.9;
        const points: Array<{ x: number; y: number }> = [];
        const segments = 18;
        for (let step = 0; step <= segments; step += 1) {
            const x = (step / segments) * mapWidth;
            const y = yBase
                + Math.sin((x / Math.max(1, mapWidth)) * Math.PI * 2 + phase) * amplitude
                + Math.sin((x / Math.max(1, mapWidth)) * Math.PI * 4 + phase * 0.7) * 0.22;
            points.push({
                x: Math.max(0.5, Math.min(mapWidth - 0.5, x)),
                y: Math.max(0.5, Math.min(mapHeight - 0.5, y)),
            });
        }
        lines.push(points);
    }
    return lines;
};

const 构建层级链 = (layers: any[], selectedLayerId: string) => {
    const layerById = new Map(layers.map((layer) => [layer.ID, layer]));
    const result: any[] = [];
    const guard = new Set<string>();
    let cursor = layerById.get(selectedLayerId);
    while (cursor && !guard.has(cursor.ID)) {
        result.unshift(cursor);
        guard.add(cursor.ID);
        cursor = cursor.父级ID ? layerById.get(cursor.父级ID) : null;
    }
    return result;
};

const GridMapScene: React.FC<Props> = ({
    world,
    env,
    socialList = [],
    debugEnabled = false,
    compact = false,
    onOpenPerson,
}) => {
    const normalizedWorld = useMemo(() => 补齐世界地图空间字段(world, { env }), [world, env]);
    const defaultScene = useMemo(() => 构建地图空间场景(world, env, socialList), [world, env, socialList]);

    const layers = Array.isArray(normalizedWorld.地图层级) ? normalizedWorld.地图层级 : [];
    const buildings = Array.isArray(normalizedWorld.地图建筑) ? normalizedWorld.地图建筑 : [];
    const roads = Array.isArray(normalizedWorld.地图道路) ? normalizedWorld.地图道路 : [];
    const persistentPeople = Array.isArray(normalizedWorld.地图人物) ? normalizedWorld.地图人物 : [];
    const defaultLayerId = defaultScene.当前层级?.ID || layers[0]?.ID || '';

    const [selectedLayerId, setSelectedLayerId] = useState(defaultLayerId);
    const [selectedFeatureId, setSelectedFeatureId] = useState('');
    const [showNpcDebug, setShowNpcDebug] = useState(false);
    const [mapZoom, setMapZoom] = useState(1);
    const [mapFocusPoint, setMapFocusPoint] = useState<{ x: number; y: number } | null>(null);
    const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
    const dragStateRef = useRef<{
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startPan: { x: number; y: number };
        viewBox: { width: number; height: number };
        rect: { width: number; height: number };
    } | null>(null);

    useEffect(() => {
        setSelectedLayerId(defaultLayerId);
    }, [defaultLayerId]);

    useEffect(() => {
        setMapZoom(1);
        setMapPan({ x: 0, y: 0 });
        setMapFocusPoint(null);
    }, [selectedLayerId]);

    const selectedLayer = useMemo(
        () => layers.find((layer) => layer.ID === selectedLayerId) || layers[0] || null,
        [layers, selectedLayerId]
    );

    const currentLayerId = selectedLayer?.ID || '';
    const currentLayerBuildings = useMemo(
        () => buildings.filter((item) => item.所在层级ID === currentLayerId),
        [buildings, currentLayerId]
    );
    const currentLayerRoads = useMemo(
        () => roads.filter((item) => item.所在层级ID === currentLayerId),
        [roads, currentLayerId]
    );
    const currentLayerPeople = useMemo(() => {
        const basePeople = persistentPeople.filter((item) => item.所在层级ID === currentLayerId);
        if (defaultScene.当前层级?.ID !== currentLayerId) {
            return basePeople;
        }
        const extraPeople = Array.isArray(defaultScene.当前层人物) ? defaultScene.当前层人物 : [];
        const taken = new Set(basePeople.map((item) => `${item.所在层级ID}|${归一化地图文本(item.名称)}`));
        return [
            ...basePeople,
            ...extraPeople.filter((item) => {
                const key = `${item.所在层级ID}|${归一化地图文本(item.名称)}`;
                if (taken.has(key)) return false;
                taken.add(key);
                return true;
            }),
        ];
    }, [persistentPeople, defaultScene.当前层级?.ID, defaultScene.当前层人物, currentLayerId]);

    const layerChain = useMemo(
        () => (selectedLayer ? 构建层级链(layers, selectedLayer.ID) : []),
        [layers, selectedLayer]
    );
    const siblingLayers = useMemo(() => {
        if (!selectedLayer) return layers;
        const parentId = selectedLayer.父级ID || '';
        return layers.filter((layer) => (layer.父级ID || '') === parentId);
    }, [layers, selectedLayer]);
    const childLayers = useMemo(
        () => (selectedLayer ? layers.filter((layer) => layer.父级ID === selectedLayer.ID) : []),
        [layers, selectedLayer]
    );

    const features = useMemo(() => {
        const list: Array<{ id: string; kind: 'building' | 'road' | 'person'; data: any }> = [];
        currentLayerBuildings.forEach((item) => list.push({ id: `building:${item.ID}`, kind: 'building', data: item }));
        currentLayerRoads.forEach((item) => list.push({ id: `road:${item.ID}`, kind: 'road', data: item }));
        currentLayerPeople.forEach((item) => list.push({ id: `person:${item.ID}`, kind: 'person', data: item }));
        return list;
    }, [currentLayerBuildings, currentLayerRoads, currentLayerPeople]);

    useEffect(() => {
        if (!features.some((item) => item.id === selectedFeatureId)) {
            const preferredPerson = features.find((item) => item.kind === 'person' && item.data?.是否当前玩家);
            const preferredBuilding = features.find((item) => defaultScene.命中建筑ID列表.includes(item.data?.ID));
            setSelectedFeatureId(preferredPerson?.id || preferredBuilding?.id || features[0]?.id || '');
        }
    }, [features, selectedFeatureId, defaultScene.命中建筑ID列表]);

    const selectedFeature = useMemo<选中对象类型>(
        () => features.find((item) => item.id === selectedFeatureId) || null,
        [features, selectedFeatureId]
    );

    const mapWidth = Math.max(12, Number(selectedLayer?.网格宽度) || 24);
    const mapHeight = Math.max(12, Number(selectedLayer?.网格高度) || 24);
    const 约束标签X = (x: number, width: number) => Math.max(0.25, Math.min(mapWidth - width - 0.25, x - width / 2));
    const 匹配社交人物 = (person: any) => {
        const normalizedName = 归一化地图文本(person?.名称);
        const linkedId = 取文本(person?.关联NPC || person?.关联NPCID || person?.npcId || person?.NPCID);
        return (Array.isArray(socialList) ? socialList : []).find((npc: any) => {
            const npcId = 取文本(npc?.id || npc?.ID);
            const npcName = 归一化地图文本(npc?.姓名);
            return (linkedId && npcId === linkedId) || (normalizedName && npcName === normalizedName);
        });
    };
    const 打开人物 = (person: any) => {
        setSelectedFeatureId(`person:${person.ID}`);
        if (person?.是否当前玩家 && person?.坐标) {
            setMapFocusPoint({ x: person.坐标.x, y: person.坐标.y });
            setMapPan({ x: 0, y: 0 });
            return;
        }
        const matchedNpc = 匹配社交人物(person);
        onOpenPerson?.(matchedNpc ? { ...matchedNpc, 地图人物: person } : person);
    };
    const currentPlace = 取文本(env?.具体地点, 取文本(env?.小地点, '未知地点'));
    const contourLines = useMemo(
        () => 生成等高线(selectedLayer, currentLayerBuildings, mapWidth, mapHeight),
        [selectedLayer, currentLayerBuildings, mapWidth, mapHeight]
    );
    const contentBounds = useMemo(() => {
        let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
        currentLayerBuildings.forEach((building) => {
            (Array.isArray(building?.四角坐标) ? building.四角坐标 : []).forEach((point: any) => {
                bounds = 扩展边界(bounds, point);
            });
        });
        currentLayerRoads.forEach((road) => {
            (Array.isArray(road?.路径点) ? road.路径点 : []).forEach((point: any) => {
                bounds = 扩展边界(bounds, point);
            });
        });
        currentLayerPeople.forEach((person) => {
            bounds = 扩展边界(bounds, person?.坐标);
        });
        if (!bounds) return { x: 0, y: 0, width: mapWidth, height: mapHeight };
        const rawWidth = Math.max(8, bounds.maxX - bounds.minX);
        const rawHeight = Math.max(8, bounds.maxY - bounds.minY);
        const padding = Math.max(rawWidth, rawHeight) * 0.18 + 4;
        const x = 约束数值(bounds.minX - padding, 0, Math.max(0, mapWidth - 1));
        const y = 约束数值(bounds.minY - padding, 0, Math.max(0, mapHeight - 1));
        const width = Math.min(mapWidth - x, rawWidth + padding * 2);
        const height = Math.min(mapHeight - y, rawHeight + padding * 2);
        return { x, y, width: Math.max(1, width), height: Math.max(1, height) };
    }, [currentLayerBuildings, currentLayerRoads, currentLayerPeople, mapWidth, mapHeight]);
    const mapViewBox = useMemo(() => {
        const zoom = 约束数值(mapZoom, 1, 8);
        const width = Math.max(1, contentBounds.width / zoom);
        const height = Math.max(1, contentBounds.height / zoom);
        const centerX = (mapFocusPoint?.x ?? (contentBounds.x + contentBounds.width / 2)) + mapPan.x;
        const centerY = (mapFocusPoint?.y ?? (contentBounds.y + contentBounds.height / 2)) + mapPan.y;
        const x = 约束数值(centerX - width / 2, 0, Math.max(0, mapWidth - width));
        const y = 约束数值(centerY - height / 2, 0, Math.max(0, mapHeight - height));
        return { x, y, width, height };
    }, [contentBounds, mapFocusPoint, mapHeight, mapPan, mapWidth, mapZoom]);
    const handleMapWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        setMapZoom((prev) => 约束数值(Number((prev + direction * 0.35).toFixed(2)), 1, 8));
    }, []);
    const handleMapPointerDown = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
        if (event.button !== 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        dragStateRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startPan: mapPan,
            viewBox: { width: mapViewBox.width, height: mapViewBox.height },
            rect: { width: Math.max(1, rect.width), height: Math.max(1, rect.height) },
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    }, [mapPan, mapViewBox.height, mapViewBox.width]);
    const handleMapPointerMove = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
        const state = dragStateRef.current;
        if (!state || state.pointerId !== event.pointerId) return;
        const dx = (event.clientX - state.startClientX) / state.rect.width * state.viewBox.width;
        const dy = (event.clientY - state.startClientY) / state.rect.height * state.viewBox.height;
        setMapFocusPoint(null);
        setMapPan({
            x: state.startPan.x - dx,
            y: state.startPan.y - dy,
        });
    }, []);
    const handleMapPointerUp = React.useCallback((event: React.PointerEvent<SVGSVGElement>) => {
        const state = dragStateRef.current;
        if (state?.pointerId === event.pointerId) {
            dragStateRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    }, []);
    const labelScale = 1 / Math.max(1, mapZoom);
    const buildingLabelFontSize = Math.max(0.34, 1.15 * labelScale);
    const personLabelFontSize = Math.max(0.28, 0.72 * labelScale);
    const personLabelHeight = Math.max(0.42, 1.05 * labelScale);

    const npcDebugRows = useMemo(() => {
        const keys = [
            env?.具体地点,
            env?.小地点,
            env?.中地点,
            env?.大地点,
            selectedLayer?.名称,
            ...currentLayerBuildings.map((building) => building?.名称),
        ].map(归一化地图文本).filter(Boolean);
        return (Array.isArray(socialList) ? socialList : []).map((npc: any, index: number) => {
            const rawLocationText = [
                npc?.当前位置,
                npc?.所在地点,
                npc?.具体地点,
                npc?.地点,
                npc?.位置,
                npc?.归属?.大地点,
                npc?.归属?.中地点,
                npc?.归属?.小地点,
            ].map((item) => String(item || '')).filter(Boolean).join(' / ');
            const normalizedLocation = 归一化地图文本(rawLocationText);
            const hitKeys = keys.filter((key) => normalizedLocation.includes(key) || (normalizedLocation && key.includes(normalizedLocation)));
            return {
                id: npc?.id || npc?.姓名 || `map-npc-debug-${index}`,
                name: npc?.姓名 || '未命名',
                rawLocationText,
                finalVisible: npc?.是否在场 === true || hitKeys.length > 0,
            };
        });
    }, [socialList, env, selectedLayer?.名称, currentLayerBuildings]);

    const detailTitle = selectedFeature?.data?.名称 || selectedLayer?.名称 || currentPlace;
    const detailType = selectedFeature?.kind === 'building'
        ? '建筑面'
        : selectedFeature?.kind === 'road'
            ? '道路线'
            : selectedFeature?.kind === 'person'
                ? '人物点'
                : '层级';
    const detailBody = selectedFeature?.kind === 'building'
        ? `${selectedFeature.data?.描述 || '暂无描述。'}\n四角坐标：${selectedFeature.data?.四角坐标?.map((point: any) => 点位文本(point)).join(' / ') || '无'}`
        : selectedFeature?.kind === 'road'
            ? `${selectedFeature.data?.描述 || '暂无描述。'}\n路径：${路径文本(selectedFeature.data?.路径点 || [])}`
            : selectedFeature?.kind === 'person'
                ? `${selectedFeature.data?.描述 || '暂无描述。'}\n坐标：${点位文本(selectedFeature.data?.坐标 || { x: 0, y: 0 })}`
                : `${selectedLayer?.描述 || '暂无描述。'}\n锚点：${selectedLayer ? 点位文本(selectedLayer.锚点坐标) : '无'}\n网格：${selectedLayer ? `${selectedLayer.网格宽度} x ${selectedLayer.网格高度}` : '无'}`;

    const layerSummaryText = selectedLayer
        ? `${selectedLayer.层级} / 锚点 ${点位文本(selectedLayer.锚点坐标)} / ${selectedLayer.网格宽度}x${selectedLayer.网格高度}`
        : '暂无层级';

    return (
        <div className={`grid min-h-0 gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-[260px_minmax(0,1fr)]'}`}>
            <aside className={`min-h-0 overflow-hidden rounded-2xl border border-wuxia-gold/15 bg-black/35 ${compact ? 'p-3' : 'p-3.5'}`}>
                <div className="mb-3 flex items-center justify-between gap-2 text-[11px] tracking-widest text-wuxia-gold/75">
                    <span>地图层级</span>
                    <span className="rounded border border-wuxia-gold/15 bg-black/35 px-2 py-0.5 font-mono text-gray-400">{layers.length}</span>
                </div>

                <div className="mb-3 rounded-xl border border-wuxia-gold/10 bg-black/30 p-3">
                    <div className="text-[10px] tracking-[0.24em] text-wuxia-gold/60">当前路径</div>
                    <div className="mt-2 text-sm leading-6 text-gray-300">
                        {layerChain.length > 0 ? layerChain.map((layer, index) => (
                            <span key={layer.ID}>
                                <span className={layer.ID === currentLayerId ? 'text-wuxia-gold' : ''}>{layer.名称}</span>
                                {index < layerChain.length - 1 ? <span className="mx-1 text-gray-600">/</span> : null}
                            </span>
                        )) : '未命中层级'}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">{layerSummaryText}</div>
                </div>

                <div className="max-h-[12rem] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                    {siblingLayers.map((layer) => {
                        const active = layer.ID === currentLayerId;
                        return (
                            <button
                                key={layer.ID}
                                type="button"
                                onClick={() => setSelectedLayerId(layer.ID)}
                                className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                                    active
                                        ? 'border-wuxia-gold/55 bg-wuxia-gold/12 text-wuxia-gold shadow-[0_0_16px_rgba(212,175,55,0.12)]'
                                        : 'border-white/10 bg-black/25 text-gray-300 hover:border-wuxia-gold/25'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-serif text-sm font-bold">{layer.名称}</span>
                                    <span className="text-[10px] text-gray-500">{layer.层级}</span>
                                </div>
                                <div className="mt-1 truncate text-[10px] text-gray-500">
                                    建筑 {layer.建筑物ID列表.length} / 道路 {layer.道路ID列表.length} / 人物 {layer.人物ID列表.length}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {childLayers.length > 0 && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3">
                        <div className="mb-2 text-[10px] tracking-[0.24em] text-wuxia-gold/60">下一级</div>
                        <div className="flex flex-wrap gap-2">
                            {childLayers.map((layer) => (
                                <button
                                    key={layer.ID}
                                    type="button"
                                    onClick={() => setSelectedLayerId(layer.ID)}
                                    className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] text-gray-300 hover:border-wuxia-gold/25 hover:text-wuxia-gold"
                                >
                                    {layer.名称}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </aside>

            <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
                <section className="min-h-0 overflow-hidden rounded-2xl border border-wuxia-gold/20 bg-[linear-gradient(180deg,rgba(19,16,12,0.96),rgba(6,6,5,0.98))]">
                    <div className="flex items-center justify-between gap-3 border-b border-wuxia-gold/10 bg-black/35 px-4 py-3">
                        <div className="min-w-0">
                            <div className="truncate font-serif text-lg font-bold text-wuxia-gold">{selectedLayer?.名称 || '未命中层级'}</div>
                            <div className="mt-1 truncate text-[11px] tracking-widest text-gray-500">{env?.大地点 || '未知'} / {env?.中地点 || '未知'} / {env?.小地点 || '未知'} / {env?.具体地点 || '未知'}</div>
                        </div>
                        <div className="rounded-full border border-wuxia-gold/20 bg-wuxia-gold/10 px-3 py-1 text-[10px] text-wuxia-gold">
                            建筑 {currentLayerBuildings.length} / 道路 {currentLayerRoads.length} / 人物 {currentLayerPeople.length}
                        </div>
                    </div>

                    <div className={`relative ${compact ? 'h-[340px]' : 'h-full min-h-[420px]'} overflow-hidden overscroll-contain`} onWheel={handleMapWheel}>
                        <div className="absolute right-3 top-3 z-10 rounded-full border border-wuxia-gold/20 bg-black/60 px-3 py-1 text-[10px] font-mono text-wuxia-gold/80">
                            缩放 {mapZoom.toFixed(1)}x
                        </div>
                        <svg
                            className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing touch-none"
                            viewBox={`${mapViewBox.x} ${mapViewBox.y} ${mapViewBox.width} ${mapViewBox.height}`}
                            preserveAspectRatio="xMidYMid meet"
                            onPointerDown={handleMapPointerDown}
                            onPointerMove={handleMapPointerMove}
                            onPointerUp={handleMapPointerUp}
                            onPointerCancel={handleMapPointerUp}
                        >
                            {Array.from({ length: Math.floor(mapWidth) + 1 }).map((_, index) => (
                                <line
                                    key={`grid-x-${index}`}
                                    x1={index}
                                    y1={0}
                                    x2={index}
                                    y2={mapHeight}
                                    stroke={index % 4 === 0 ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.05)'}
                                    strokeWidth={index % 4 === 0 ? 0.12 : 0.06}
                                    pointerEvents="none"
                                />
                            ))}
                            {Array.from({ length: Math.floor(mapHeight) + 1 }).map((_, index) => (
                                <line
                                    key={`grid-y-${index}`}
                                    x1={0}
                                    y1={index}
                                    x2={mapWidth}
                                    y2={index}
                                    stroke={index % 4 === 0 ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.05)'}
                                    strokeWidth={index % 4 === 0 ? 0.12 : 0.06}
                                    pointerEvents="none"
                                />
                            ))}

                            {contourLines.map((points, index) => (
                                <polyline
                                    key={`contour-${index}`}
                                    points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                                    fill="none"
                                    stroke={index % 2 === 0 ? 'rgba(125, 211, 252, 0.13)' : 'rgba(187, 247, 208, 0.12)'}
                                    strokeWidth={0.12}
                                    strokeDasharray="0.6 0.45"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    pointerEvents="none"
                                />
                            ))}

                            {currentLayerRoads.map((road) => {
                                const active = selectedFeatureId === `road:${road.ID}`;
                                return (
                                    <g
                                        key={road.ID}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedFeatureId(`road:${road.ID}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                setSelectedFeatureId(`road:${road.ID}`);
                                            }
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <polyline
                                            points={road.路径点.map((point: any) => `${point.x},${point.y}`).join(' ')}
                                            fill="none"
                                            stroke="rgba(8,8,7,0.86)"
                                            strokeWidth={active ? 1.05 : 0.86}
                                            strokeLinecap="butt"
                                            strokeLinejoin="miter"
                                            pointerEvents="none"
                                        />
                                        <polyline
                                            points={road.路径点.map((point: any) => `${point.x},${point.y}`).join(' ')}
                                            fill="none"
                                            stroke={active ? 'rgba(249, 217, 118, 0.92)' : 'rgba(214, 176, 84, 0.65)'}
                                            strokeWidth={active ? 0.38 : 0.26}
                                            strokeDasharray="0.55 0.42"
                                            strokeLinecap="butt"
                                            strokeLinejoin="miter"
                                            pointerEvents="none"
                                        />
                                    </g>
                                );
                            })}

                            {currentLayerBuildings.map((building) => {
                                const active = selectedFeatureId === `building:${building.ID}`;
                                const hit = defaultScene.命中建筑ID列表.includes(building.ID);
                                const center = 计算中心(building.四角坐标);
                                return (
                                    <g
                                        key={building.ID}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setSelectedFeatureId(`building:${building.ID}`)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                setSelectedFeatureId(`building:${building.ID}`);
                                            }
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <polygon
                                            points={四角转点串(building.四角坐标)}
                                            fill={active ? 'rgba(245, 208, 92, 0.34)' : hit ? 'rgba(245, 158, 11, 0.24)' : 'rgba(255,255,255,0.12)'}
                                            stroke={active ? 'rgba(249, 217, 118, 0.96)' : hit ? 'rgba(245, 158, 11, 0.72)' : 'rgba(229,231,235,0.35)'}
                                            strokeWidth={active ? 0.32 : 0.2}
                                            pointerEvents="none"
                                        />
                                        <text
                                            x={center.x}
                                            y={center.y}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill={active || hit ? '#f8df9a' : 'rgba(229,231,235,0.78)'}
                                            fontSize={buildingLabelFontSize}
                                            pointerEvents="none"
                                        >
                                            {building.名称.slice(0, 6)}
                                        </text>
                                    </g>
                                );
                            })}

                            {currentLayerPeople.map((person) => {
                                const active = selectedFeatureId === `person:${person.ID}`;
                                const showLabel = true;
                                const labelText = person.名称.slice(0, 6);
                                const labelWidth = Math.max(1.6, (labelText.length * 0.68 + 0.7) * labelScale);
                                const labelX = 约束标签X(person.坐标.x, labelWidth);
                                const labelY = Math.max(0.25, person.坐标.y - personLabelHeight * 0.5);
                                return (
                                    <g
                                        key={person.ID}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => 打开人物(person)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                打开人物(person);
                                            }
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <circle
                                            cx={person.坐标.x}
                                            cy={person.坐标.y}
                                            r={person.是否当前玩家 ? 0.85 : 0.65}
                                            fill={person.是否当前玩家 ? 'rgba(249, 217, 118, 0.96)' : active ? 'rgba(147, 197, 253, 0.95)' : 'rgba(196, 181, 253, 0.85)'}
                                            stroke={person.是否当前玩家 ? 'rgba(255, 244, 183, 1)' : 'rgba(10,10,10,0.7)'}
                                            strokeWidth={0.16}
                                            pointerEvents="auto"
                                        />
                                        {showLabel && (
                                            <>
                                                <rect
                                                    x={labelX}
                                                    y={labelY}
                                                    width={labelWidth}
                                                    height={personLabelHeight}
                                                    rx={Math.max(0.1, 0.24 * labelScale)}
                                                    fill={person.是否当前玩家 ? 'rgba(63, 49, 12, 0.92)' : 'rgba(5, 8, 14, 0.92)'}
                                                    stroke={active ? 'rgba(249, 217, 118, 0.86)' : 'rgba(255,255,255,0.28)'}
                                                    strokeWidth={0.08}
                                                    pointerEvents="none"
                                                />
                                                <text
                                                    x={labelX + labelWidth / 2}
                                                    y={labelY + personLabelHeight / 2}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill={person.是否当前玩家 ? '#fde68a' : 'rgba(229,231,235,0.92)'}
                                                    fontSize={personLabelFontSize}
                                                    pointerEvents="none"
                                                >
                                                    {labelText}
                                                </text>
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                </section>

                <section className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]'}`}>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="truncate font-serif text-lg font-bold text-wuxia-gold">{detailTitle}</div>
                                <div className="mt-1 text-[11px] tracking-widest text-gray-500">{detailType}</div>
                            </div>
                            {selectedFeature?.kind === 'person' && selectedFeature.data?.是否当前玩家 && (
                                <span className="rounded-full border border-wuxia-gold/25 bg-wuxia-gold/10 px-2 py-1 text-[10px] text-wuxia-gold">当前位置</span>
                            )}
                        </div>
                        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-300">{detailBody}</p>
                        {selectedFeature?.kind === 'person' && !selectedFeature.data?.是否当前玩家 && onOpenPerson && (
                            <button
                                type="button"
                                onClick={() => {
                                    const matchedNpc = 匹配社交人物(selectedFeature.data);
                                    onOpenPerson(matchedNpc ? { ...matchedNpc, 地图人物: selectedFeature.data } : selectedFeature.data);
                                }}
                                className="mt-3 rounded-lg border border-wuxia-gold/30 bg-wuxia-gold/10 px-3 py-2 text-xs font-bold text-wuxia-gold hover:bg-wuxia-gold hover:text-black"
                            >
                                查看角色
                            </button>
                        )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <div className="mb-2 text-[11px] tracking-widest text-wuxia-gold/70">当前层概况</div>
                        <div className="space-y-2 text-sm text-gray-300">
                            <div>当前命中地点：{currentPlace}</div>
                            <div>层级链：{layerChain.length > 0 ? layerChain.map((layer) => layer.名称).join(' / ') : '未知'}</div>
                            <div>建筑面：{currentLayerBuildings.length} 个</div>
                            <div>道路线：{currentLayerRoads.length} 条</div>
                            <div>人物点：{currentLayerPeople.length} 个</div>
                        </div>

                        {debugEnabled && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowNpcDebug((prev) => !prev)}
                                    className="mt-4 rounded-lg border border-sky-400/25 bg-sky-950/20 px-3 py-2 text-xs text-sky-200"
                                >
                                    {showNpcDebug ? '收起 NPC 调试' : '展开 NPC 调试'}
                                </button>
                                {showNpcDebug && (
                                    <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-sky-400/20 bg-sky-950/10 p-3 custom-scrollbar">
                                        {npcDebugRows.length > 0 ? npcDebugRows.map((row) => (
                                            <div key={row.id} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-gray-300">
                                                <span className="text-gray-100">{row.name}</span>
                                                <span className="mx-2 text-gray-600">/</span>
                                                <span className={row.finalVisible ? 'text-emerald-300' : 'text-gray-500'}>{row.finalVisible ? '会显示' : '未命中'}</span>
                                                <span className="ml-2 text-gray-500">{row.rawLocationText || '无位置字段'}</span>
                                            </div>
                                        )) : <div className="py-3 text-center text-xs text-gray-500">暂无 NPC 数据</div>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default GridMapScene;
