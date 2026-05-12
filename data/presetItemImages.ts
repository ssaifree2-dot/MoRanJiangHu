/**
 * 预置物品图片库
 * 常见武侠物品的预生成图片 URL，托管在 CDN 上。
 * 客户端优先从此库匹配图片，匹配不到时才触发实时生图。
 */

export interface 预置物品图片条目 {
    名称: string;
    类型: string;
    品质: string;
    图片URL: string;
    关键词?: string[]; // 用于模糊匹配
}

const CDN_BASE = 'https://download.bacon.de5.net/moranjianghu/item-images';

/**
 * 预置物品图片注册表
 * 按类别组织，每个条目包含名称、类型、品质和 CDN 图片 URL
 */
export const 预置物品图片列表: 预置物品图片条目[] = [
    // ─── 武器：剑 ───────────────────────────────────────────────────────
    { 名称: '青钢剑', 类型: '武器', 品质: '良品', 图片URL: `${CDN_BASE}/weapon-sword-fine-01.png`, 关键词: ['剑', '青钢', '铁剑'] },
    { 名称: '玄铁重剑', 类型: '武器', 品质: '极品', 图片URL: `${CDN_BASE}/weapon-sword-top-01.png`, 关键词: ['重剑', '玄铁'] },
    { 名称: '碧水长剑', 类型: '武器', 品质: '上品', 图片URL: `${CDN_BASE}/weapon-sword-superior-01.png`, 关键词: ['长剑', '碧水'] },
    { 名称: '断水剑', 类型: '武器', 品质: '绝世', 图片URL: `${CDN_BASE}/weapon-sword-mythic-01.png`, 关键词: ['断水', '名剑'] },
    { 名称: '锈铁剑', 类型: '武器', 品质: '凡品', 图片URL: `${CDN_BASE}/weapon-sword-common-01.png`, 关键词: ['铁剑', '锈剑', '普通剑'] },

    // ─── 武器：刀 ───────────────────────────────────────────────────────
    { 名称: '柳叶刀', 类型: '武器', 品质: '良品', 图片URL: `${CDN_BASE}/weapon-saber-fine-01.png`, 关键词: ['刀', '柳叶'] },
    { 名称: '鬼头大刀', 类型: '武器', 品质: '上品', 图片URL: `${CDN_BASE}/weapon-saber-superior-01.png`, 关键词: ['大刀', '鬼头'] },
    { 名称: '雪饮狂刀', 类型: '武器', 品质: '绝世', 图片URL: `${CDN_BASE}/weapon-saber-mythic-01.png`, 关键词: ['狂刀', '雪饮'] },

    // ─── 武器：枪/棍 ─────────────────────────────────────────────────────
    { 名称: '白蜡杆枪', 类型: '武器', 品质: '良品', 图片URL: `${CDN_BASE}/weapon-spear-fine-01.png`, 关键词: ['枪', '长枪', '白蜡'] },
    { 名称: '霸王枪', 类型: '武器', 品质: '极品', 图片URL: `${CDN_BASE}/weapon-spear-top-01.png`, 关键词: ['霸王', '重枪'] },
    { 名称: '齐眉棍', 类型: '武器', 品质: '凡品', 图片URL: `${CDN_BASE}/weapon-staff-common-01.png`, 关键词: ['棍', '齐眉'] },

    // ─── 武器：弓/暗器 ───────────────────────────────────────────────────
    { 名称: '铁胎弓', 类型: '武器', 品质: '上品', 图片URL: `${CDN_BASE}/weapon-bow-superior-01.png`, 关键词: ['弓', '铁胎'] },
    { 名称: '袖箭', 类型: '武器', 品质: '良品', 图片URL: `${CDN_BASE}/weapon-hidden-fine-01.png`, 关键词: ['暗器', '袖箭'] },
    { 名称: '毒针', 类型: '武器', 品质: '上品', 图片URL: `${CDN_BASE}/weapon-hidden-superior-01.png`, 关键词: ['暗器', '毒针', '银针'] },

    // ─── 防具 ───────────────────────────────────────────────────────────
    { 名称: '玄铁护甲', 类型: '防具', 品质: '极品', 图片URL: `${CDN_BASE}/armor-heavy-top-01.png`, 关键词: ['甲', '护甲', '玄铁'] },
    { 名称: '锁子甲', 类型: '防具', 品质: '上品', 图片URL: `${CDN_BASE}/armor-chain-superior-01.png`, 关键词: ['锁子', '铁甲'] },
    { 名称: '软猬甲', 类型: '防具', 品质: '绝世', 图片URL: `${CDN_BASE}/armor-soft-mythic-01.png`, 关键词: ['软猬', '内甲'] },
    { 名称: '布衣', 类型: '防具', 品质: '凡品', 图片URL: `${CDN_BASE}/armor-cloth-common-01.png`, 关键词: ['布衣', '粗布', '麻衣'] },
    { 名称: '青衫', 类型: '防具', 品质: '良品', 图片URL: `${CDN_BASE}/armor-robe-fine-01.png`, 关键词: ['青衫', '长衫', '儒衫'] },
    { 名称: '护腕', 类型: '防具', 品质: '良品', 图片URL: `${CDN_BASE}/armor-bracer-fine-01.png`, 关键词: ['护腕', '臂甲'] },

    // ─── 消耗品：丹药 ─────────────────────────────────────────────────────
    { 名称: '辟谷丹', 类型: '消耗品', 品质: '凡品', 图片URL: `${CDN_BASE}/pill-bigu-common-01.png`, 关键词: ['辟谷', '丹药'] },
    { 名称: '回气丹', 类型: '消耗品', 品质: '凡品', 图片URL: `${CDN_BASE}/pill-huiqi-common-01.png`, 关键词: ['回气', '丹药', '恢复'] },
    { 名称: '凝元丹', 类型: '消耗品', 品质: '良品', 图片URL: `${CDN_BASE}/pill-ningyuan-fine-01.png`, 关键词: ['凝元', '丹药', '内力'] },
    { 名称: '破境丹', 类型: '消耗品', 品质: '极品', 图片URL: `${CDN_BASE}/pill-pojing-top-01.png`, 关键词: ['破境', '丹药', '突破'] },
    { 名称: '大还丹', 类型: '消耗品', 品质: '绝世', 图片URL: `${CDN_BASE}/pill-dahuan-mythic-01.png`, 关键词: ['大还', '丹药', '疗伤'] },
    { 名称: '金创药', 类型: '消耗品', 品质: '凡品', 图片URL: `${CDN_BASE}/medicine-jinchuang-common-01.png`, 关键词: ['金创', '药', '止血'] },
    { 名称: '解毒散', 类型: '消耗品', 品质: '良品', 图片URL: `${CDN_BASE}/medicine-jiedu-fine-01.png`, 关键词: ['解毒', '散', '药粉'] },
    { 名称: '续命丹', 类型: '消耗品', 品质: '极品', 图片URL: `${CDN_BASE}/pill-xuming-top-01.png`, 关键词: ['续命', '丹药', '救命'] },

    // ─── 材料 ───────────────────────────────────────────────────────────
    { 名称: '寒铁矿', 类型: '材料', 品质: '上品', 图片URL: `${CDN_BASE}/material-ore-superior-01.png`, 关键词: ['矿', '寒铁', '铁矿'] },
    { 名称: '千年灵芝', 类型: '材料', 品质: '极品', 图片URL: `${CDN_BASE}/material-herb-top-01.png`, 关键词: ['灵芝', '药材', '千年'] },
    { 名称: '蛇胆', 类型: '材料', 品质: '良品', 图片URL: `${CDN_BASE}/material-animal-fine-01.png`, 关键词: ['蛇胆', '药材'] },
    { 名称: '玄冰石', 类型: '材料', 品质: '上品', 图片URL: `${CDN_BASE}/material-gem-superior-01.png`, 关键词: ['玄冰', '矿石', '宝石'] },
    { 名称: '百年何首乌', 类型: '材料', 品质: '上品', 图片URL: `${CDN_BASE}/material-herb-superior-01.png`, 关键词: ['何首乌', '药材', '百年'] },
    { 名称: '铁木', 类型: '材料', 品质: '良品', 图片URL: `${CDN_BASE}/material-wood-fine-01.png`, 关键词: ['铁木', '木材'] },
    { 名称: '兽皮', 类型: '材料', 品质: '凡品', 图片URL: `${CDN_BASE}/material-leather-common-01.png`, 关键词: ['兽皮', '皮革', '皮料'] },

    // ─── 秘籍 ───────────────────────────────────────────────────────────
    { 名称: '基础剑法残卷', 类型: '秘籍', 品质: '凡品', 图片URL: `${CDN_BASE}/scroll-sword-common-01.png`, 关键词: ['剑法', '残卷', '秘籍'] },
    { 名称: '吐纳心法', 类型: '秘籍', 品质: '良品', 图片URL: `${CDN_BASE}/scroll-inner-fine-01.png`, 关键词: ['吐纳', '心法', '内功'] },
    { 名称: '轻身术', 类型: '秘籍', 品质: '良品', 图片URL: `${CDN_BASE}/scroll-agility-fine-01.png`, 关键词: ['轻功', '轻身', '身法'] },
    { 名称: '金钟罩', 类型: '秘籍', 品质: '上品', 图片URL: `${CDN_BASE}/scroll-defense-superior-01.png`, 关键词: ['金钟罩', '外功', '防御'] },
    { 名称: '九阳真经', 类型: '秘籍', 品质: '传说', 图片URL: `${CDN_BASE}/scroll-legendary-01.png`, 关键词: ['九阳', '真经', '传说'] },

    // ─── 饰品 ───────────────────────────────────────────────────────────
    { 名称: '玉佩', 类型: '饰品', 品质: '良品', 图片URL: `${CDN_BASE}/accessory-jade-fine-01.png`, 关键词: ['玉佩', '玉', '佩饰'] },
    { 名称: '银簪', 类型: '饰品', 品质: '良品', 图片URL: `${CDN_BASE}/accessory-hairpin-fine-01.png`, 关键词: ['簪', '银簪', '发簪'] },
    { 名称: '护身符', 类型: '饰品', 品质: '上品', 图片URL: `${CDN_BASE}/accessory-amulet-superior-01.png`, 关键词: ['护身符', '符', '护身'] },
    { 名称: '夜明珠', 类型: '饰品', 品质: '极品', 图片URL: `${CDN_BASE}/accessory-pearl-top-01.png`, 关键词: ['夜明珠', '珠', '宝珠'] },

    // ─── 杂物/通用 ─────────────────────────────────────────────────────
    { 名称: '火折子', 类型: '杂物', 品质: '凡品', 图片URL: `${CDN_BASE}/misc-firestarter-common-01.png`, 关键词: ['火折', '火'] },
    { 名称: '绳索', 类型: '杂物', 品质: '凡品', 图片URL: `${CDN_BASE}/misc-rope-common-01.png`, 关键词: ['绳', '绳索'] },
    { 名称: '地图', 类型: '杂物', 品质: '良品', 图片URL: `${CDN_BASE}/misc-map-fine-01.png`, 关键词: ['地图', '舆图'] },
    { 名称: '银两', 类型: '杂物', 品质: '凡品', 图片URL: `${CDN_BASE}/misc-silver-common-01.png`, 关键词: ['银两', '银子', '碎银'] },
];

/**
 * 按物品名称精确匹配预置图片
 */
export const 精确匹配预置图片 = (itemName: string): 预置物品图片条目 | null => {
    if (!itemName) return null;
    const normalized = itemName.trim();
    return 预置物品图片列表.find(entry => entry.名称 === normalized) || null;
};

/**
 * 按物品类型+品质+关键词模糊匹配预置图片
 */
export const 模糊匹配预置图片 = (
    itemName: string,
    itemType: string,
    itemQuality: string
): 预置物品图片条目 | null => {
    if (!itemName && !itemType) return null;
    const name = (itemName || '').trim();
    const type = (itemType || '').trim();
    const quality = (itemQuality || '').trim();

    // 先按关键词匹配
    if (name) {
        const keywordMatch = 预置物品图片列表.find(entry =>
            entry.关键词?.some(kw => name.includes(kw))
        );
        if (keywordMatch) return keywordMatch;
    }

    // 再按类型+品质匹配
    if (type && quality) {
        const typeQualityMatch = 预置物品图片列表.find(entry =>
            entry.类型 === type && entry.品质 === quality
        );
        if (typeQualityMatch) return typeQualityMatch;
    }

    // 最后只按类型匹配
    if (type) {
        return 预置物品图片列表.find(entry => entry.类型 === type) || null;
    }

    return null;
};

/**
 * 获取物品的预置图片 URL（精确 > 模糊 > null）
 */
export const 获取预置物品图片URL = (
    itemName: string,
    itemType?: string,
    itemQuality?: string
): string | null => {
    const exact = 精确匹配预置图片(itemName);
    if (exact) return exact.图片URL;

    const fuzzy = 模糊匹配预置图片(itemName, itemType || '', itemQuality || '');
    if (fuzzy) return fuzzy.图片URL;

    return null;
};
