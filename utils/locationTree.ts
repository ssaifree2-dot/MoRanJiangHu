import type { 世界数据结构, 环境信息结构 } from '../types';

export type 地点层级类型 = '寰宇' | '大地点' | '中地点' | '小地点' | '区地点' | '子地点';

export interface 地点树节点 {
    ID: string;
    名称: string;
    层级: 地点层级类型;
    父级ID: string;
    描述: string;
    子节点: 地点树节点[];
}

export interface 地点树结构 {
    根节点: 地点树节点 | null;
    当前节点: 地点树节点 | null;
    节点映射: Map<string, 地点树节点>;
    面包屑: 地点树节点[];
}

const 取文本 = (v: unknown, fallback = ''): string => {
    if (typeof v !== 'string') return fallback;
    return v.trim() || fallback;
};

const 归一化地图文本 = (value: unknown): string => String(value || '').trim().replace(/\s+/g, '').toLowerCase();

const 层级映射: Record<string, 地点层级类型> = {
    '寰宇': '寰宇', '大地点': '大地点', '中地点': '中地点', '小地点': '小地点',
    '子地点': '子地点', '具体地点': '区地点', '室内': '子地点', '房间': '子地点',
    '区地点': '区地点',
};

const 归一化层级 = (raw?: string): 地点层级类型 => 层级映射[raw || ''] || '小地点';

export const 构建地点树 = (
    world?: 世界数据结构 | null,
    env?: 环境信息结构 | null
): 地点树结构 => {
    const layers = Array.isArray(world?.地图层级) ? world.地图层级 : [];
    const 节点映射 = new Map<string, 地点树节点>();

    // 第一步：层级转节点
    layers.forEach((layer: any) => {
        const id = 取文本(layer?.ID) || `layer-${Math.random().toString(36).slice(2, 8)}`;
        节点映射.set(id, {
            ID: id,
            名称: 取文本(layer?.名称) || '未命名区域',
            层级: 归一化层级(layer?.层级),
            父级ID: 取文本(layer?.父级ID),
            描述: 取文本(layer?.描述),
            子节点: [],
        });
    });

    // 第二步：名称→ID索引
    const nameToId = new Map<string, string>();
    节点映射.forEach(n => {
        const nm = 归一化地图文本(n.名称);
        if (nm && !nameToId.has(nm)) nameToId.set(nm, n.ID);
    });

    // 第2.5步：寰宇去重——只保留第一个寰宇，其余降为大地点
    const 寰宇节点s = Array.from(节点映射.values()).filter(n => n.层级 === '寰宇');
    if (寰宇节点s.length > 1) {
        const keeper = 寰宇节点s[0];
        寰宇节点s.slice(1).forEach(dup => {
            dup.层级 = '大地点';
            dup.父级ID = keeper.ID;
            keeper.子节点.push(dup);
        });
    }

    // 第三步：合并重名（同层+同父）
    const keyFn = (n: 地点树节点) => `${归一化地图文本(n.名称)}|${n.层级}|${n.父级ID}`;
    const groups = new Map<string, 地点树节点[]>();
    节点映射.forEach(n => {
        const k = keyFn(n);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(n);
    });
    groups.forEach(g => {
        if (g.length < 2) return;
        const keeper = g[0];
        g.slice(1).forEach(dup => {
            if (!keeper.描述 && dup.描述) keeper.描述 = dup.描述;
            节点映射.forEach(n => { if (n.父级ID === dup.ID) n.父级ID = keeper.ID; });
            dup.子节点.forEach(c => { if (!keeper.子节点.some(kc => kc.ID === c.ID)) { keeper.子节点.push(c); c.父级ID = keeper.ID; } });
            节点映射.delete(dup.ID);
        });
    });

    // 第四步：建立父子关系（带名称回退）
    节点映射.forEach(node => {
        let pid = node.父级ID;
        if (!pid || pid === node.ID) return;
        if (!节点映射.has(pid)) {
            const nm = nameToId.get(归一化地图文本(pid));
            if (nm) { pid = nm; node.父级ID = nm; }
        }
        if (!节点映射.has(pid)) return;
        const parent = 节点映射.get(pid)!;
        if (!parent.子节点.some(c => c.ID === node.ID)) parent.子节点.push(node);
    });

    // 第五步：找根节点
    const nodes = Array.from(节点映射.values());
    const 层级优先级: Record<string, number> = { '寰宇': 0, '大地点': 1, '中地点': 2, '小地点': 3, '区地点': 4, '子地点': 5 };
    let rootNodes = nodes.filter(n => !n.父级ID || !节点映射.has(n.父级ID))
        .sort((a, b) => (层级优先级[a.层级] ?? 5) - (层级优先级[b.层级] ?? 5));
    if (rootNodes.length === 0 && nodes.length > 0) {
        nodes.sort((a, b) => (层级优先级[a.层级] ?? 5) - (层级优先级[b.层级] ?? 5))[0].父级ID = '';
        rootNodes = [nodes[0]];
    }
    const root = rootNodes[0] || null;

    // 第六步：定位当前节点
    let currentNode: 地点树节点 | null = null;
    if (env) {
        for (const name of [env.具体地点, env.小地点, env.中地点, env.大地点].map(n => 取文本(n)).filter(Boolean)) {
            const found = nodes.find(n => n.名称 === name);
            if (found) { currentNode = found; break; }
        }
    }
    if (!currentNode) currentNode = root;

    // 第七步：面包屑
    const 面包屑: 地点树节点[] = [];
    let cursor: 地点树节点 | null = currentNode;
    const visited = new Set<string>();
    while (cursor && !visited.has(cursor.ID)) {
        面包屑.unshift(cursor);
        visited.add(cursor.ID);
        cursor = cursor.父级ID && 节点映射.has(cursor.父级ID) ? 节点映射.get(cursor.父级ID) || null : null;
    }

    return { 根节点: root, 当前节点: currentNode, 节点映射, 面包屑 };
};

export const 获取兄弟节点 = (node: 地点树节点 | null, tree: 地点树结构): 地点树节点[] => {
    if (!node) return [];
    if (node.父级ID && tree.节点映射.has(node.父级ID)) return tree.节点映射.get(node.父级ID)!.子节点;
    return tree.根节点 ? [tree.根节点] : [];
};
