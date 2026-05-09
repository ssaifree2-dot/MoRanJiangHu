export interface 标准使用效果 {
    目标属性: string;
    数值: number;
    依据?: string;
}

const 取文本 = (value: unknown, fallback = ''): string => (
    typeof value === 'string' ? value.trim() : fallback
);

const 取数字 = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const 规范属性名 = (value: unknown): string => {
    const text = 取文本(value);
    if (!text || text === '目标属性' || text === '未知' || text === '无') return '';
    if (/气血|生命|血量|伤势/.test(text)) return '全身血量';
    if (/内力|真气|灵力/.test(text)) return '当前内力';
    if (/精力|体力|耐力/.test(text)) return '当前精力';
    if (/饱腹|饥饿/.test(text)) return '当前饱腹';
    if (/水分|口渴/.test(text)) return '当前水分';
    return text;
};

const 推断基础数值 = (item: any): number => {
    const quality = 取文本(item?.品质);
    const qualityBase: Record<string, number> = {
        凡品: 20,
        良品: 40,
        上品: 70,
        极品: 110,
        绝世: 160,
        传说: 240,
    };
    const byQuality = qualityBase[quality] ?? 35;
    const byValue = Math.round(Math.max(0, 取数字(item?.价值)) / 12);
    return Math.max(10, Math.min(300, Math.max(byQuality, byValue)));
};

export const 规范化消耗品使用效果 = (item: any): 标准使用效果[] => {
    if (!item || 取文本(item?.类型) !== '消耗品') return [];

    const rawEffects = Array.isArray(item?.使用效果) ? item.使用效果 : [];
    const effects: 标准使用效果[] = rawEffects
        .map((effect: any) => ({
            目标属性: 规范属性名(effect?.目标属性),
            数值: 取数字(effect?.数值, Number.NaN),
            依据: 取文本(effect?.依据),
        }))
        .filter((effect) => (
            effect.目标属性
            && effect.目标属性 !== '目标属性'
            && Number.isFinite(effect.数值)
            && effect.数值 !== 0
        ));

    if (effects.length > 0) return 合并同类效果(effects);

    const text = `${取文本(item?.名称)} ${取文本(item?.描述)} ${取文本(item?.视觉描述)}`;
    const base = 推断基础数值(item);
    const inferred: 标准使用效果[] = [];
    const add = (目标属性: string, 数值: number, 依据: string) => {
        inferred.push({ 目标属性, 数值: Math.round(数值), 依据 });
    };

    if (/内力|真气|灵力|回气|补气|补内|元气/.test(text)) {
        add('当前内力', base, '根据名称/描述中的内力、真气、回气等词补全。');
    }
    if (/精力|体力|耐力|醒神|续航|疲劳|提神/.test(text)) {
        add('当前精力', base, '根据名称/描述中的精力、体力、醒神等词补全。');
    }
    if (/气血|生命|疗伤|活血|止血|接骨|续筋|回春|伤势|创伤|化瘀/.test(text)) {
        add('全身血量', Math.round(base * 0.75), '根据名称/描述中的疗伤、活血、接骨、化瘀等词补全。');
    }
    if (/饱腹|干粮|食物|饭|肉|糕|饼|酒|茶/.test(text)) {
        add('当前饱腹', Math.round(base * 0.8), '根据名称/描述中的食物、干粮、酒茶等词补全。');
    }
    if (/水分|清水|泉水|甘露|饮水|解渴/.test(text)) {
        add('当前水分', Math.round(base * 0.8), '根据名称/描述中的水分、清水、甘露等词补全。');
    }
    if (/迷烟|烟弹|毒粉|麻痹|眩晕|致盲|控场/.test(text)) {
        add('敌方命中', -15, '根据名称/描述中的迷烟、麻痹、致盲等词补全为战术控场效果。');
    }
    if (inferred.length === 0 && /丹|药|丸|散|膏|露/.test(text)) {
        add('当前精力', Math.round(base * 0.6), '旧存档缺少明确效果，按丹药/药品兜底补为精力恢复。');
    }

    return 合并同类效果(inferred);
};

const 合并同类效果 = (effects: 标准使用效果[]): 标准使用效果[] => {
    const merged = new Map<string, 标准使用效果>();
    effects.forEach((effect) => {
        const current = merged.get(effect.目标属性);
        if (!current) {
            merged.set(effect.目标属性, { ...effect });
            return;
        }
        current.数值 += effect.数值;
        if (!current.依据 && effect.依据) current.依据 = effect.依据;
    });
    return Array.from(merged.values());
};
