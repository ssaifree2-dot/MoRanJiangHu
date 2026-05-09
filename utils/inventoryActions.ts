const 取数字 = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const 取文本 = (value: unknown, fallback = ''): string => (
    typeof value === 'string' ? value.trim() : fallback
);

const 深拷贝 = <T,>(data: T): T => JSON.parse(JSON.stringify(data)) as T;

export const 是否杂物类物品 = (item: any): boolean => {
    const type = 取文本(item?.类型);
    return type === '杂物' || type === '杂项';
};

export const 重新计算背包负重 = (items: any[]): number => (
    Math.round(items.reduce((sum, item) => (
        sum + Math.max(0, 取数字(item?.重量)) * Math.max(1, Math.trunc(取数字(item?.堆叠数量, 1)))
    ), 0) * 10) / 10
);

export const 丢弃背包物品 = (character: any, itemId: string, count = 1) => {
    const nextCharacter = 深拷贝(character || {});
    nextCharacter.物品列表 = Array.isArray(nextCharacter?.物品列表) ? nextCharacter.物品列表 : [];
    const target = 取文本(itemId);
    if (!target) return { ok: false as const, nextCharacter, message: '未选择要丢弃的物品。' };

    const itemIndex = nextCharacter.物品列表.findIndex((item: any) => item?.ID === target || item?.名称 === target);
    const item = itemIndex >= 0 ? nextCharacter.物品列表[itemIndex] : null;
    if (!item) return { ok: false as const, nextCharacter, message: '背包中未找到该物品。' };

    const itemName = 取文本(item?.名称, '物品');
    const currentCount = Math.max(1, Math.trunc(取数字(item?.堆叠数量, 1)));
    const requestedCount = count === Number.POSITIVE_INFINITY ? currentCount : Math.trunc(取数字(count, 1));
    const discardCount = Math.max(1, Math.min(currentCount, requestedCount));
    if (currentCount > discardCount) {
        item.堆叠数量 = currentCount - discardCount;
    } else {
        nextCharacter.物品列表.splice(itemIndex, 1);
        const equippedSlot = 取文本(item?.当前装备部位);
        if (equippedSlot && nextCharacter?.装备 && typeof nextCharacter.装备 === 'object') {
            nextCharacter.装备[equippedSlot] = '无';
        }
    }

    nextCharacter.当前负重 = 重新计算背包负重(nextCharacter.物品列表);
    return {
        ok: true as const,
        nextCharacter,
        message: discardCount > 1 ? `已丢弃 ${itemName} x${discardCount}` : `已丢弃 ${itemName}`
    };
};

export const 丢弃所有杂物 = (character: any) => {
    const nextCharacter = 深拷贝(character || {});
    const items = Array.isArray(nextCharacter?.物品列表) ? nextCharacter.物品列表 : [];
    const removed = items.filter(是否杂物类物品);
    nextCharacter.物品列表 = items.filter((item: any) => !是否杂物类物品(item));
    nextCharacter.当前负重 = 重新计算背包负重(nextCharacter.物品列表);
    const removedCount = removed.reduce((sum: number, item: any) => sum + Math.max(1, Math.trunc(取数字(item?.堆叠数量, 1))), 0);
    return {
        ok: removed.length > 0 as boolean,
        nextCharacter,
        removed,
        removedCount,
        message: removed.length > 0 ? `已丢弃 ${removedCount} 件杂物。` : '背包中没有可丢弃的杂物。'
    };
};
