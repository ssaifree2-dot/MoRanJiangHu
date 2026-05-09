import type { 战斗状态结构, 角色数据结构 } from '../types';
import type { 游戏物品, 物品词条 } from '../models/item';
import { 规范化消耗品使用效果 } from './itemEffects';

export interface 规则说明 {
    名称: string;
    说明: string;
    公式: string;
}

export interface 属性明细条目 {
    标签: string;
    数值: string;
    依据: string;
}

export interface 物品明细分组 {
    标题: string;
    条目: 属性明细条目[];
}

export interface 战斗可视化数据 {
    玩家: {
        攻势: number;
        守势: number;
        身法: number;
        续航: number;
        装备攻势: number;
        装备守势: number;
    };
    敌方: Array<{
        名称: string;
        攻势: number;
        守势: number;
        气血比例: number;
        精力比例: number;
        威胁: '压制' | '均势' | '可破' | '失能';
        判定: string;
    }>;
    阶段: Array<{
        名称: string;
        描述: string;
        依据: string;
    }>;
}

export const 逻辑判断知识库: 规则说明[] = [
    {
        名称: '通用货币折算',
        说明: '拍卖行买卖不再要求手动换兑，所有金额先折算为铜钱，再自动拆回元宝、银子、铜钱。',
        公式: '总铜钱 = 铜钱 + 银子 * 1000 + 金元宝 * 100000',
    },
    {
        名称: '物品市场价',
        说明: '背包寄售按物品自身价值、堆叠数量、品质和当日行情生成，不再由玩家手填价格。',
        公式: '市场价 = max(1, floor(物品价值 * 品质系数 * 行情倍率))',
    },
    {
        名称: '装备攻势',
        说明: '装备的攻击、词条、耐久会进入战斗界面的可视化攻势，不额外生成第二套主属性。',
        公式: '装备攻势 = 武器均伤 + 攻击类词条 + 耐久修正',
    },
    {
        名称: '装备守势',
        说明: '防具、防御词条和角色体质根骨共同影响守势，用于解释战斗中的承伤能力。',
        公式: '守势 = 体质 * 1.4 + 根骨 * 1.2 + 装备守势 + 境界层级 * 4',
    },
    {
        名称: '战斗先机',
        说明: '先机从敏捷、当前精力比例和正文战况提示综合展示，只作为解释和 UI 提示。',
        公式: '身法 = 敏捷 * 1.5 + 当前精力 / 最大精力 * 20',
    },
];

const 读数 = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const 读文本 = (value: unknown, fallback = '') => (
    typeof value === 'string' && value.trim() ? value.trim() : fallback
);

const 格式数值 = (value: unknown, fallback = 0) => 读数(value, fallback).toLocaleString('zh-CN');

const 百分比 = (value: number) => `${Math.round(value * 100)}%`;

const 词条转条目 = (词条列表: unknown, context: string): 属性明细条目[] => {
    if (!Array.isArray(词条列表)) return [];
    return 词条列表
        .map((entry: 物品词条) => {
            const name = 读文本(entry?.名称, '词条');
            const attr = 读文本(entry?.属性, '属性');
            const value = 读数(entry?.数值);
            const type = entry?.类型 === '百分比' ? '%' : '';
            if (!attr || attr === '属性' || !Number.isFinite(value) || value === 0) return null;
            return {
                标签: `${name} · ${attr}`,
                数值: `${value > 0 ? '+' : ''}${value}${type}`,
                依据: `${context}：来自物品词条列表，按同名属性并入统一判定。`,
            };
        })
        .filter(Boolean) as 属性明细条目[];
};

export const 获取物品明细分组 = (item: 游戏物品 | any): 物品明细分组[] => {
    if (!item) return [];
    const type = 读文本(item?.类型, '未知');
    const stackCount = Math.max(1, 读数(item?.堆叠数量, 1));
    const stackMax = Math.max(stackCount, 读数(item?.最大堆叠, stackCount));
    const groups: 物品明细分组[] = [
        {
            标题: '基础',
            条目: [
                { 标签: '类型', 数值: type, 依据: '物品.类型 决定分类、可用操作和战斗映射。' },
                { 标签: '品质', 数值: 读文本(item?.品质, '未知'), 依据: '物品.品质 影响市场价、装备评分和稀有度显示。' },
                { 标签: '单件价值', 数值: `${格式数值(item?.价值)} 铜`, 依据: '物品.价值 是市场寄售与拍卖标价的基础铜钱值。' },
                { 标签: '重量', 数值: `${格式数值(item?.重量)} 斤`, 依据: '物品.重量 * 堆叠数量 计入当前负重。' },
                { 标签: '堆叠', 数值: `${格式数值(stackCount, 1)} / ${格式数值(stackMax, 1)}`, 依据: '堆叠数量决定出售、使用和总价值的数量基数。' },
                { 标签: '耐久', 数值: `${格式数值(item?.当前耐久)} / ${格式数值(item?.最大耐久)}`, 依据: '战斗、格挡和恶劣环境会消耗耐久；耐久过低会削弱装备贡献。' },
            ],
        },
    ];

    const equipEntries: 属性明细条目[] = [];
    if (type === '武器') {
        equipEntries.push(
            { 标签: '攻击区间', 数值: `${格式数值(item?.最小攻击)} - ${格式数值(item?.最大攻击)}`, 依据: '武器.最小攻击/最大攻击 取均值后进入装备攻势。' },
            { 标签: '攻速修正', 数值: `x${读数(item?.攻速修正, 1).toFixed(2)}`, 依据: '武器.攻速修正 影响先手和连续出招解释。' },
            { 标签: '格挡率', 数值: `${格式数值(item?.格挡率)}%`, 依据: '武器.格挡率 作为接战防御的辅助来源。' },
        );
    }
    if (type === '防具') {
        equipEntries.push(
            { 标签: '装备位置', 数值: 读文本(item?.装备位置, 读文本(item?.当前装备部位, '未知')), 依据: '防具.装备位置 决定覆盖身体区域。' },
            { 标签: '覆盖部位', 数值: Array.isArray(item?.覆盖部位) ? item.覆盖部位.join(' / ') : '未标注', 依据: '覆盖部位决定战斗受击时优先抵消的部位。' },
            { 标签: '物理防御', 数值: 格式数值(item?.物理防御), 依据: '防具.物理防御 进入装备守势。' },
            { 标签: '内功防御', 数值: 格式数值(item?.内功防御), 依据: '防具.内功防御 进入内力/真气类伤害减免解释。' },
        );
    }
    if (type === '饰品') {
        equipEntries.push({ 标签: '饰品定位', 数值: 读文本(item?.当前装备部位, '腰部/背部/坐骑等'), 依据: '饰品主要通过词条和特殊效果影响判定。' });
    }
    if (equipEntries.length > 0) groups.push({ 标题: '装备属性', 条目: equipEntries });

    if (type === '消耗品') {
        const effects = 规范化消耗品使用效果(item);
        groups.push({
            标题: '使用增益',
            条目: effects.length > 0
                ? effects.map((effect: any) => ({
                    标签: 读文本(effect?.目标属性, '效果'),
                    数值: `${读数(effect?.数值) > 0 ? '+' : ''}${格式数值(effect?.数值)}`,
                    依据: effect?.依据 || '消耗品.使用效果 会直接写回对应角色属性，并按最大值裁切。',
                }))
                : [{ 标签: '效果', 数值: '未标注', 依据: '该消耗品缺少 使用效果[]，系统只能展示描述文本。' }],
        });
        groups.push({
            标题: '副作用',
            条目: [{ 标签: '毒性/负担', 数值: 格式数值(item?.毒性), 依据: '消耗品.毒性 用于丹毒、负担或后续事件判断。' }],
        });
    }

    const affixes = 词条转条目(item?.词条列表, '物品词条');
    if (affixes.length > 0) groups.push({ 标题: '词条增益', 条目: affixes });

    return groups;
};

const 计算装备贡献 = (character: any) => {
    const items = Array.isArray(character?.物品列表) ? character.物品列表 : [];
    const equipped = items.filter((item: any) => item?.当前装备部位);
    return equipped.reduce((acc, item: any) => {
        const durabilityMax = Math.max(1, 读数(item?.最大耐久, 100));
        const durabilityRatio = item?.最大耐久 === 0 ? 1 : Math.max(0.15, Math.min(1, 读数(item?.当前耐久, durabilityMax) / durabilityMax));
        const type = 读文本(item?.类型);
        if (type === '武器') {
            const avg = (读数(item?.最小攻击) + 读数(item?.最大攻击)) / 2;
            acc.攻势 += avg * durabilityRatio;
            acc.身法 += Math.max(0, (读数(item?.攻速修正, 1) - 1) * 20);
        }
        if (type === '防具') {
            acc.守势 += (读数(item?.物理防御) + 读数(item?.内功防御) * 0.8) * durabilityRatio;
        }
        if (Array.isArray(item?.词条列表)) {
            item.词条列表.forEach((entry: 物品词条) => {
                const attr = 读文本(entry?.属性);
                const value = 读数(entry?.数值);
                if (/攻击|伤害|力道|破甲/.test(attr)) acc.攻势 += value;
                if (/防御|护体|减伤|格挡/.test(attr)) acc.守势 += value;
                if (/速度|身法|闪避|敏捷/.test(attr)) acc.身法 += value;
            });
        }
        return acc;
    }, { 攻势: 0, 守势: 0, 身法: 0 });
};

export const 生成战斗可视化数据 = (
    character: 角色数据结构 | any,
    battle: 战斗状态结构 | any,
    contextText = ''
): 战斗可视化数据 => {
    const equip = 计算装备贡献(character);
    const hpParts = ['头部', '胸部', '腹部', '左手', '右手', '左腿', '右腿'];
    const currentHp = hpParts.reduce((sum, part) => sum + Math.max(0, 读数(character?.[`${part}当前血量`])), 0);
    const maxHp = hpParts.reduce((sum, part) => sum + Math.max(0, 读数(character?.[`${part}最大血量`])), 0);
    const staminaRatio = Math.max(0, Math.min(1, 读数(character?.当前精力) / Math.max(1, 读数(character?.最大精力, 1))));
    const realm = Math.max(1, 读数(character?.境界层级, 1));
    const player = {
        攻势: Math.round(读数(character?.力量) * 2 + 读数(character?.敏捷) * 0.8 + realm * 8 + equip.攻势),
        守势: Math.round(读数(character?.体质) * 1.4 + 读数(character?.根骨) * 1.2 + realm * 4 + equip.守势),
        身法: Math.round(读数(character?.敏捷) * 1.5 + staminaRatio * 20 + equip.身法),
        续航: Math.round((Math.max(0, currentHp) / Math.max(1, maxHp)) * 50 + staminaRatio * 50),
        装备攻势: Math.round(equip.攻势),
        装备守势: Math.round(equip.守势),
    };

    const enemies = (Array.isArray(battle?.敌方) ? battle.敌方 : []).map((enemy: any) => {
        const hpRatio = Math.max(0, Math.min(1, 读数(enemy?.当前血量) / Math.max(1, 读数(enemy?.最大血量, 1))));
        const spRatio = Math.max(0, Math.min(1, 读数(enemy?.当前精力) / Math.max(1, 读数(enemy?.最大精力, 1))));
        const attack = Math.round(读数(enemy?.战斗力) + 读数(enemy?.当前内力) * 0.08 + spRatio * 12);
        const defense = Math.round(读数(enemy?.防御力) + hpRatio * 10);
        const gap = player.攻势 - defense;
        const threatGap = attack - player.守势;
        const disabled = hpRatio <= 0;
        const threat: '压制' | '均势' | '可破' | '失能' = disabled
            ? '失能'
            : threatGap > 12 ? '压制' : gap > 12 ? '可破' : '均势';
        return {
            名称: 读文本(enemy?.名字, '敌方'),
            攻势: attack,
            守势: defense,
            气血比例: hpRatio,
            精力比例: spRatio,
            威胁: threat,
            判定: disabled
                ? '气血归零，按失能处理。'
                : `我方攻势 ${player.攻势} 对其守势 ${defense}，敌方攻势 ${attack} 对我方守势 ${player.守势}。`,
        };
    });

    const hasAmbush = /伏击|偷袭|暗器|围攻|夹击/.test(contextText);
    const hasTerrain = /狭窄|高处|水边|林|坡|谷|雨|雪|夜/.test(contextText);

    return {
        玩家: player,
        敌方: enemies,
        阶段: [
            {
                名称: '先机',
                描述: hasAmbush ? '正文出现伏击/偷袭语义，先机需偏向突发风险。' : `我方身法 ${player.身法}，由敏捷、精力和装备修正合成。`,
                依据: '身法 = 敏捷 * 1.5 + 当前精力比例 * 20 + 装备身法修正。',
            },
            {
                名称: '接战',
                描述: enemies.length > 0 ? `当前可视化 ${enemies.length} 名敌方，优先关注“压制”和“可破”目标。` : '当前没有敌方单位，战斗界面保持休战态。',
                依据: '敌方攻势读取 战斗.敌方[].战斗力/当前内力/当前精力。',
            },
            {
                名称: '攻防',
                描述: `我方攻势 ${player.攻势}，守势 ${player.守势}；装备贡献攻 ${player.装备攻势} / 守 ${player.装备守势}。`,
                依据: '角色六维、境界层级、装备属性、词条与耐久共同进入解释。',
            },
            {
                名称: '环境',
                描述: hasTerrain ? '正文含地形或天气语义，后续正文判定应显式解释地利影响。' : '正文未出现强地形语义，按普通接战环境显示。',
                依据: '从最近正文提取地形词，仅用于前端提示和模型规则对齐。',
            },
        ],
    };
};
