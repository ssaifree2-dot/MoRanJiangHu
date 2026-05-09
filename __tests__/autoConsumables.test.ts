import { describe, expect, it } from 'vitest';
import { 执行自动丹药补给, 补齐自动丹药预设 } from '../utils/autoConsumables';

const createRole = () => ({
    姓名: '测试角色',
    性别: '男',
    年龄: 16,
    出生日期: '',
    外貌: '',
    性格: '',
    称号: '',
    境界: '开脉境',
    境界层级: 1,
    天赋列表: [],
    出身背景: { 名称: '', 描述: '', 效果: '' },
    所属门派ID: 'sect',
    门派职位: '外门弟子',
    门派贡献: 0,
    金钱: { 金元宝: 0, 银子: 0, 铜钱: 0 },
    当前精力: 4,
    最大精力: 100,
    当前内力: 25,
    最大内力: 150,
    当前饱腹: 19,
    最大饱腹: 100,
    当前口渴: 0,
    最大口渴: 100,
    当前负重: 0,
    最大负重: 100,
    力量: 0,
    敏捷: 0,
    体质: 0,
    根骨: 0,
    悟性: 0,
    福源: 0,
    头部当前血量: 10,
    头部最大血量: 10,
    头部状态: '',
    胸部当前血量: 10,
    胸部最大血量: 10,
    胸部状态: '',
    腹部当前血量: 10,
    腹部最大血量: 10,
    腹部状态: '',
    左手当前血量: 10,
    左手最大血量: 10,
    左手状态: '',
    右手当前血量: 10,
    右手最大血量: 10,
    右手状态: '',
    左腿当前血量: 10,
    左腿最大血量: 10,
    左腿状态: '',
    右腿当前血量: 10,
    右腿最大血量: 10,
    右腿状态: '',
    装备: {
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
    },
    物品列表: 补齐自动丹药预设([]),
    功法列表: [],
    当前经验: 675,
    升级经验: 202,
    玩家BUFF: [],
    突破条件: []
} as any);

describe('auto consumable rules', () => {
    it('adds default pills and auto uses them for low resources and breakthrough', () => {
        const role = createRole();
        const corrections = 执行自动丹药补给(role);

        expect(role.当前精力).toBeGreaterThan(4);
        expect(role.当前饱腹).toBeGreaterThan(19);
        expect(role.当前口渴).toBeGreaterThan(0);
        expect(role.境界层级).toBe(2);
        expect(corrections.some((item: string) => item.includes('破境丹'))).toBe(true);
        expect(role.物品列表.some((item: any) => item.名称 === '辟谷丹')).toBe(true);
    });
});
