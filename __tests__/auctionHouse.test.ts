import { describe, expect, it } from 'vitest';
import { 创建默认拍卖行状态, 清理并补货, 投放事件拍卖品, 从剧情响应构建拍卖行投放参数列表 } from '../services/auctionHouse';

describe('拍卖行默认补货', () => {
    it('新档默认拍卖行状态不自动生成系统拍品', () => {
        const state = 创建默认拍卖行状态();

        // 新档应该没有系统拍品，等待剧情触发
        expect(state.行情列表.length).toBeGreaterThan(0); // 行情仍然生成
        expect(state.拍卖品列表.filter((entry) => entry.状态 === '上架中').length).toBe(0); // 没有拍品
        expect(state.最近补货时间).toBe(0); // 没有补货
    });

    it('剧情触发时允许系统补货', () => {
        const emptyState = {
            拍卖品列表: [],
            交易记录: [],
            最近补货时间: 0,
            行情列表: [],
            最近行情时间: 0
        };
        
        // 模拟剧情触发投放
        const state = 投放事件拍卖品(emptyState, {
            事件名称: '测试事件',
            来源描述: '测试来源',
            物品: {
                名称: '测试物品',
                类型: '武器',
                品质: '上品',
                价值: 1000
            }
        });

        // 剧情触发后应该有系统补货
        expect(state.拍卖品列表.some((entry) => entry.卖家ID.startsWith('system_'))).toBe(true);
        expect(state.拍卖品列表.filter((entry) => entry.状态 === '上架中').length).toBeGreaterThan(0);
    });
    
    it('系统补货时避免重复物品', () => {
        const state = 清理并补货({
            拍卖品列表: [],
            交易记录: [],
            最近补货时间: 0,
            行情列表: [],
            最近行情时间: 0
        }, { 允许系统补货: true });

        const itemKeys = state.拍卖品列表
            .filter((entry) => entry.状态 === '上架中')
            .map((entry) => `${entry.物品.名称}|${entry.物品.类型}|${entry.物品.品质}`);
        
        // 检查没有完全重复的物品
        const uniqueKeys = new Set(itemKeys);
        expect(uniqueKeys.size).toBe(itemKeys.length);
    });
});

describe('拍卖行剧情物品入市过滤', () => {
    it('玩家身边或持有的物品不会因为本回合出现就流入市场', () => {
        const result = 从剧情响应构建拍卖行投放参数列表({
            logs: [
                {
                    sender: '旁白',
                    text: '你低头看了看放在枕边的青玉佩，又摸了摸那件浆洗得有些发白的青云剑。两样东西都在你身边，并没有任何人拿去出售。'
                }
            ]
        } as any, { maxCount: 3 });

        expect(result.shouldDispatch).toBe(false);
        expect(result.reason).toContain('市场流通');
    });

    it('有明确市场语义时清理修饰词，只投放核心物品名', () => {
        const result = 从剧情响应构建拍卖行投放参数列表({
            logs: [
                {
                    sender: '旁白',
                    text: '黑市摊客今晚摆出那件浆洗得有些发白的青云剑，并标价出售，称其仍是青云宗旧物。'
                }
            ]
        } as any, { maxCount: 1 });

        expect(result.shouldDispatch).toBe(true);
        expect(result.params?.物品?.名称).toBe('青云剑');
    });

    it('AI 提取误判玩家私有物时仍会被确定性过滤', () => {
        const result = 从剧情响应构建拍卖行投放参数列表({
            logs: [
                {
                    sender: '旁白',
                    text: '你低头看了看放在枕边的青玉佩，确认它仍是自己的随身旧物。'
                }
            ]
        } as any, {
            maxCount: 1,
            useAIExtraction: true,
            aiExtractionResult: {
                是否有市场语义: true,
                是否有稀有物语义: false,
                提取的物品列表: [
                    {
                        名称: '青玉佩',
                        类型: '饰品',
                        品质: '上品',
                        描述: '玩家身边的随身旧物',
                        价格估值: 8200,
                        是否合理: true
                    }
                ]
            }
        });

        expect(result.shouldDispatch).toBe(false);
        expect(result.reason).toContain('具体物品入市');
    });
});
