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
});
