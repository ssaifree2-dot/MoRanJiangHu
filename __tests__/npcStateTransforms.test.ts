import { describe, expect, it } from 'vitest';
import { 规范化社交列表 } from '../hooks/useGame/stateTransforms';

describe('NPC old save compatibility', () => {
    it('repairs teammate combat caps, equipment and bag from legacy placeholders', () => {
        const [npc] = 规范化社交列表([
            {
                id: 'legacy_shen_ruoyan',
                姓名: '沈若嫣',
                性别: '女',
                身份: '青云山庄二小姐',
                境界: '开脉第二重',
                是否队友: true,
                当前血量: 0,
                最大血量: 1,
                当前精力: 72,
                最大精力: 1,
                当前内力: 15,
                最大内力: 1,
                攻击力: 0,
                防御力: 0,
                当前装备: {},
                背包: []
            }
        ], { 合并同名: false });

        expect(npc.最大血量).toBeGreaterThan(1);
        expect(npc.当前血量).toBe(npc.最大血量);
        expect(npc.最大精力).toBeGreaterThanOrEqual(72);
        expect(npc.最大内力).toBeGreaterThanOrEqual(15);
        expect(npc.攻击力).toBeGreaterThan(0);
        expect(npc.防御力).toBeGreaterThan(0);
        expect(npc.当前装备.主武器).not.toBe('无');
        expect(npc.当前装备.服装).not.toBe('无');
        expect(npc.背包.length).toBeGreaterThan(0);
    });

    it('replaces explanatory prose in NPC equipment slots with safe item names', () => {
        const [npc] = 规范化社交列表([
            {
                id: 'npc_bad_equipment_text',
                姓名: '林婉',
                性别: '女',
                身份: '青云门外门弟子',
                境界: '开脉第一重',
                当前装备: {
                    主武器: '根据她青云门外门弟子的身份，应该生成一柄轻便佩剑。',
                    服装: '服装：青云门外门弟子青衫；饰品：身份腰牌',
                    鞋履: '轻便布靴'
                },
                背包: []
            }
        ], { 合并同名: false });

        expect(npc.当前装备.主武器).toBe('青云佩剑');
        expect(npc.当前装备.服装).toBe('青云绣裙');
        expect(npc.当前装备.鞋履).toBe('轻便布靴');
        expect(npc.当前装备.主武器).not.toContain('根据');
        expect(npc.当前装备.服装).not.toContain('服装：');
    });

    it('derives NPC talents, background and stable non-zero skills from identity when model omitted them', () => {
        const [npc] = 规范化社交列表([
            {
                id: 'npc_healer_major',
                姓名: '苏晚晴',
                性别: '女',
                身份: '药堂医女',
                简介: '常年在药堂照看伤患，也懂得辨识草药。',
                境界: '聚息境中期',
                是否主要角色: true,
                技艺: [
                    { 名称: '炼器', 等级: '未入门', 熟练度: 0 },
                    { 名称: '炼丹', 等级: '未入门', 熟练度: 0 },
                    { 名称: '医术', 等级: '未入门', 熟练度: 0 },
                    { 名称: '阵法', 等级: '未入门', 熟练度: 0 },
                    { 名称: '符箓', 等级: '未入门', 熟练度: 0 },
                    { 名称: '机关', 等级: '未入门', 熟练度: 0 },
                    { 名称: '采集', 等级: '未入门', 熟练度: 0 },
                    { 名称: '鉴定', 等级: '未入门', 熟练度: 0 }
                ]
            }
        ], { 合并同名: false });

        const 医术 = npc.技艺.find((item: any) => item.名称 === '医术');
        const positiveSkills = npc.技艺.filter((item: any) => item.熟练度 > 0);

        expect(npc.境界).toBe('聚息境二重');
        expect(npc.出身背景.名称).toContain('医药');
        expect(npc.天赋列表.length).toBeGreaterThan(0);
        expect(医术).toBeTruthy();
        expect(医术?.熟练度).toBeGreaterThanOrEqual(18);
        expect(positiveSkills.length).toBeGreaterThanOrEqual(2);
        expect(positiveSkills.map((item: any) => item.名称)).not.toEqual(['采集']);
    });

    it('replaces legacy single采集 fallback with bounded ordinary NPC skills', () => {
        const [npc] = 规范化社交列表([
            {
                id: 'npc_ordinary_guard',
                姓名: '赵平安',
                性别: '男',
                身份: '镖局趟子手',
                简介: '负责押车、看货和辨认路上风险。',
                境界: '开脉境一重',
                技艺: [
                    { 名称: '采集', 等级: '入门', 熟练度: 10, 描述: '江湖历练所得。' }
                ]
            }
        ], { 合并同名: false });

        const positiveSkills = npc.技艺.filter((item: any) => item.熟练度 > 0);

        expect(npc.出身背景.名称).toBeTruthy();
        expect(npc.天赋列表.length).toBeGreaterThan(0);
        expect(positiveSkills.length).toBeGreaterThanOrEqual(1);
        expect(Math.max(...positiveSkills.map((item: any) => item.熟练度))).toBeLessThanOrEqual(32);
        expect(positiveSkills.some((item: any) => item.名称 !== '采集' || item.熟练度 !== 10)).toBe(true);
    });

    it('drops dialogue narration fragments that were mistaken for NPC names', () => {
        const list = 规范化社交列表([
            {
                id: 'npc_dialogue_fragment',
                姓名: '她轻声细语地',
                性别: '未知',
                身份: '剧情对话人物',
                对白登场: true,
                自动补全头像: true
            },
            {
                id: 'npc_su_waner',
                姓名: '苏婉儿',
                性别: '女',
                身份: '贴身侍女'
            }
        ], { 合并同名: false });

        expect(list.map((npc: any) => npc.姓名)).toEqual(['苏婉儿']);
    });
});
