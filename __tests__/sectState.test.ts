import { describe, expect, it } from 'vitest';
import { 创建空门派状态, 创建开场基础状态, 创建开场命令基态, 规范化门派状态, 是否无门派标识, 保护开局生成门派状态 } from '../hooks/useGame/storyState';

describe('门派状态规范化', () => {
    it('无门派语义不会补默认同门', () => {
        const normalized = 规范化门派状态({
            ID: 'none',
            名称: '无门无派',
            玩家职位: '无',
            重要成员: [{ 姓名: '误生成的师兄' }],
            任务列表: [{ 标题: '误生成的门派任务' }]
        });

        expect(normalized).toEqual(创建空门派状态());
    });

    it('明确无门派标识会压过模型虚构的门派名称', () => {
        const normalized = 规范化门派状态({
            ID: 'none',
            名称: '青云山庄',
            玩家职位: '无'
        });

        expect(normalized.ID).toBe('none');
        expect(normalized.名称).toBe('无门无派');
        expect(normalized.重要成员).toEqual([]);
    });

    it('有效门派仍可补齐可用默认结构', () => {
        const normalized = 规范化门派状态({
            ID: 'sect_qingyun',
            名称: '青云山庄',
            玩家职位: '外门弟子'
        });

        expect(normalized.ID).toBe('sect_qingyun');
        expect(normalized.重要成员.length).toBeGreaterThan(0);
        expect(是否无门派标识(normalized.ID)).toBe(false);
    });

    it('开局命令基态会保留已选择生成的门派和同门', () => {
        const openingBase = 创建开场基础状态(
            {
                姓名: '沈墨',
                所属门派ID: '玄墨派',
                门派职位: '外门弟子',
                门派贡献: 100
            } as any,
            {} as any,
            {
                初始关系模板: '师门牵引',
                关系侧重: ['师门'],
                开局切入偏好: '门派起手',
                开局生成门派: true,
                开局生成同门: true,
                同人融合: {
                    enabled: false,
                    作品名: '',
                    来源类型: '原创',
                    融合强度: '轻度',
                    保留原著角色: false,
                    启用角色替换: false,
                    替换目标角色名: '',
                    附加替换角色名列表: [],
                    附加角色替换规则列表: [],
                    启用附加小说: false,
                    附加小说数据集ID: ''
                }
            } as any
        );
        const commandBase = 创建开场命令基态(openingBase);

        expect(commandBase.玩家门派.名称).toBe('玄墨派');
        expect(commandBase.玩家门派.玩家职位).toBe('外门弟子');
        expect(commandBase.玩家门派.重要成员.length).toBeGreaterThanOrEqual(6);
    });

    it('开局生成门派不会被模型命令覆盖回无门无派', () => {
        const base = 创建开场命令基态(创建开场基础状态(
            {
                姓名: '沈墨',
                所属门派ID: '玄墨派',
                门派职位: '外门弟子',
                门派贡献: 100
            } as any,
            {} as any,
            {
                初始关系模板: '师门牵引',
                关系侧重: ['师门'],
                开局切入偏好: '门派起手',
                开局生成门派: true,
                开局生成同门: true
            } as any
        ));

        const protectedState = 保护开局生成门派状态({
            ...base,
            角色: { ...base.角色, 所属门派ID: 'none', 门派职位: '无', 门派贡献: 0 },
            玩家门派: { ID: 'none', 名称: '无门无派', 玩家职位: '无' }
        }, base, { 开局生成门派: true } as any);

        expect(protectedState.玩家门派.名称).toBe('玄墨派');
        expect(protectedState.玩家门派.重要成员.length).toBeGreaterThanOrEqual(6);
        expect(protectedState.角色.所属门派ID).toBe('玄墨派');
        expect(protectedState.角色.门派职位).toBe('外门弟子');
    });
});
