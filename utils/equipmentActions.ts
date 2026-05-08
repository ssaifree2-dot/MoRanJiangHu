import type { 装备槽位, 角色数据结构 } from '../types';

export const 装备槽位列表: 装备槽位[] = [
    '头部',
    '胸部',
    '盔甲',
    '内衬',
    '腿部',
    '手部',
    '足部',
    '主武器',
    '副武器',
    '暗器',
    '背部',
    '腰部',
    '坐骑'
];

const 默认装备模板: Record<装备槽位, string> = {
    头部: '无',
    胸部: '无',
    盔甲: '无',
    内衬: '无',
    腿部: '无',
    手部: '无',
    足部: '无',
    主武器: '无',
    副武器: '无',
    暗器: '无',
    背部: '无',
    腰部: '无',
    坐骑: '无'
};

const 品质分: Record<string, number> = {
    凡品: 1,
    良品: 2,
    上品: 3,
    极品: 4,
    绝世: 5,
    传说: 6
};

const 装备槽位集合 = new Set<string>(装备槽位列表);
const 武器槽位集合 = new Set<装备槽位>(['主武器', '副武器', '暗器']);
const 防具槽位集合 = new Set<装备槽位>(['头部', '胸部', '盔甲', '内衬', '腿部', '手部', '足部', '背部', '腰部']);

const 深拷贝 = <T,>(data: T): T => JSON.parse(JSON.stringify(data)) as T;
const 取文本 = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value.trim() : fallback);
const 取数值 = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const 去重槽位 = (slots: 装备槽位[]): 装备槽位[] => slots.filter((slot, index) => slots.indexOf(slot) === index);

const 取物品引用 = (item: any): string => {
    const id = 取文本(item?.ID);
    if (id) return id;
    return 取文本(item?.名称, '无');
};

const 查找物品 = (items: any[], idOrName: string): any | undefined => {
    const ref = 取文本(idOrName);
    if (!ref || ref === '无') return undefined;
    return items.find((item) => item?.ID === ref || item?.名称 === ref);
};

const 推断防具槽位 = (item: any): 装备槽位[] => {
    const nameText = `${取文本(item?.名称)} ${取文本(item?.描述)} ${取文本(item?.装备位置)}`;
    const slots: 装备槽位[] = [];
    if (/头|冠|帽|盔|簪/.test(nameText)) slots.push('头部');
    if (/内衬|里衣|内甲|亵衣|贴身/.test(nameText)) slots.push('内衬');
    if (/盔甲|铠|甲胄|护甲|软甲/.test(nameText)) slots.push('盔甲');
    if (/胸|衣|袍|衫|上装|护心/.test(nameText)) slots.push('胸部');
    if (/腿|裤|裙|下装/.test(nameText)) slots.push('腿部');
    if (/手|腕|臂|护腕|手套|拳套/.test(nameText)) slots.push('手部');
    if (/足|靴|鞋|履/.test(nameText)) slots.push('足部');
    if (/背|披风|斗篷|背负/.test(nameText)) slots.push('背部');
    if (/腰|带|佩|坠|符|戒|镯|项链|挂饰/.test(nameText)) slots.push('腰部');

    const position = 取文本(item?.装备位置);
    const positionSlot: Partial<Record<string, 装备槽位>> = {
        头部: '头部',
        胸部: '胸部',
        腿部: '腿部',
        手部: '手部',
        足部: '足部'
    };
    if (positionSlot[position]) slots.push(positionSlot[position]!);
    return 去重槽位(slots.length > 0 ? slots : ['胸部']);
};

export const 获取物品可装备槽位 = (item: any): 装备槽位[] => {
    const currentSlot = 取文本(item?.当前装备部位);
    if (装备槽位集合.has(currentSlot)) return [currentSlot as 装备槽位];

    const type = 取文本(item?.类型);
    const text = `${取文本(item?.名称)} ${取文本(item?.描述)} ${取文本(item?.武器子类)}`;
    if (type === '武器') {
        if (/暗器|飞镖|袖箭|飞针|飞刀/.test(text)) return ['暗器'];
        if (/盾|副手|短刃|匕首|护手/.test(text)) return ['副武器'];
        return ['主武器'];
    }
    if (type === '防具') return 推断防具槽位(item);
    if (type === '饰品') return 推断防具槽位({ ...item, 装备位置: '腰部' });
    if (/坐骑|马|驴|骡|车|舟|船/.test(text)) return ['坐骑'];
    return [];
};

export const 是否可装备物品 = (item: any): boolean => 获取物品可装备槽位(item).length > 0;

export const 计算装备评分 = (item: any): number => {
    if (!item) return -Infinity;
    const quality = 品质分[取文本(item?.品质)] || 0;
    const affixScore = Array.isArray(item?.词条列表)
        ? item.词条列表.reduce((sum: number, affix: any) => {
            const value = Math.abs(取数值(affix?.数值, 0));
            return sum + (取文本(affix?.类型) === '百分比' ? value * 30 : value * 10);
        }, 0)
        : 0;
    const attackScore = ((取数值(item?.最小攻击, 0) + 取数值(item?.最大攻击, 0)) / 2) * 60
        + 取数值(item?.攻速修正, 1) * 25
        + 取数值(item?.格挡率, 0) * 4;
    const defenseScore = (取数值(item?.物理防御, 0) + 取数值(item?.内功防御, 0)) * 55;
    const durabilityScore = Math.min(100, 取数值(item?.当前耐久, 0)) * 0.5
        + Math.min(100, 取数值(item?.最大耐久, 0)) * 0.25;
    const valueScore = Math.log10(Math.max(0, 取数值(item?.价值, 0)) + 1) * 12;
    return quality * 100000 + attackScore + defenseScore + affixScore + durabilityScore + valueScore;
};

export const 同步装备字段 = (character: 角色数据结构): 角色数据结构 => {
    const next = 深拷贝(character) as any;
    next.装备 = { ...默认装备模板, ...(next.装备 || {}) };
    next.物品列表 = Array.isArray(next.物品列表) ? next.物品列表 : [];

    const equippedItemIds = new Set<string>();
    next.物品列表.forEach((item: any) => {
        delete item.当前装备部位;
    });

    装备槽位列表.forEach((slot) => {
        const equippedItem = 查找物品(next.物品列表, next.装备[slot]);
        if (!equippedItem) {
            next.装备[slot] = '无';
            return;
        }
        const itemRef = 取物品引用(equippedItem);
        if (!itemRef || equippedItemIds.has(itemRef)) {
            next.装备[slot] = '无';
            return;
        }
        next.装备[slot] = itemRef;
        equippedItem.当前装备部位 = slot;
        equippedItemIds.add(itemRef);
    });

    return next;
};

export const 装备物品到角色 = (
    character: 角色数据结构,
    itemIdOrName: string,
    preferredSlot?: 装备槽位
): 角色数据结构 => {
    const next = 同步装备字段(character) as any;
    const item = 查找物品(next.物品列表, itemIdOrName);
    if (!item) return next;

    const availableSlots = 获取物品可装备槽位(item);
    const targetSlot = preferredSlot && availableSlots.includes(preferredSlot)
        ? preferredSlot
        : availableSlots[0];
    if (!targetSlot) return next;

    const itemRef = 取物品引用(item);
    装备槽位列表.forEach((slot) => {
        if (next.装备[slot] === itemRef || item?.当前装备部位 === slot) {
            next.装备[slot] = '无';
        }
    });
    next.物品列表.forEach((candidate: any) => {
        if (candidate?.当前装备部位 === targetSlot || 取物品引用(candidate) === itemRef) {
            delete candidate.当前装备部位;
        }
    });
    next.装备[targetSlot] = itemRef;
    item.当前装备部位 = targetSlot;
    return 同步装备字段(next);
};

export const 卸下角色装备 = (
    character: 角色数据结构,
    itemIdOrName: string
): 角色数据结构 => {
    const next = 同步装备字段(character) as any;
    const item = 查找物品(next.物品列表, itemIdOrName);
    if (!item) return next;
    const itemRef = 取物品引用(item);
    装备槽位列表.forEach((slot) => {
        if (next.装备[slot] === itemRef || item?.当前装备部位 === slot) {
            next.装备[slot] = '无';
        }
    });
    delete item.当前装备部位;
    return 同步装备字段(next);
};

export const 自动装备最佳装备 = (
    character: 角色数据结构,
    options?: { 仅填空槽?: boolean }
): 角色数据结构 => {
    const next = 同步装备字段(character) as any;
    const candidatesBySlot = new Map<装备槽位, any[]>();
    next.物品列表.forEach((item: any) => {
        获取物品可装备槽位(item).forEach((slot) => {
            if (!candidatesBySlot.has(slot)) candidatesBySlot.set(slot, []);
            candidatesBySlot.get(slot)!.push(item);
        });
    });

    const usedIds = new Set<string>();
    if (options?.仅填空槽) {
        装备槽位列表.forEach((slot) => {
            const equipped = 查找物品(next.物品列表, next.装备[slot]);
            const ref = equipped ? 取物品引用(equipped) : '';
            if (ref) usedIds.add(ref);
        });
    }

    装备槽位列表.forEach((slot) => {
        if (options?.仅填空槽 && 取文本(next.装备[slot]) && next.装备[slot] !== '无') return;
        const candidates = (candidatesBySlot.get(slot) || [])
            .filter((item) => !usedIds.has(取物品引用(item)))
            .sort((a, b) => 计算装备评分(b) - 计算装备评分(a));
        const best = candidates[0];
        next.装备[slot] = best ? 取物品引用(best) : '无';
        if (best) usedIds.add(取物品引用(best));
    });

    return 同步装备字段(next);
};

export const 获取装备槽位标签 = (slot?: string): string => slot || '装备栏';
export const 是武器槽位 = (slot?: 装备槽位): boolean => Boolean(slot && 武器槽位集合.has(slot));
export const 是防具槽位 = (slot?: 装备槽位): boolean => Boolean(slot && 防具槽位集合.has(slot));
