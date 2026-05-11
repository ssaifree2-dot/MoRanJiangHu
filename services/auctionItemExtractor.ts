/**
 * 拍卖行物品提取服务
 * 使用 AI 来智能提取和验证物品信息，替代正则表达式
 */

import type { GameResponse } from '../types';
import type { 物品品质, 物品类型 } from '../models/item';
import type { 主线流向 } from './auctionHouse';

export interface 提取的物品信息 {
    名称: string;
    类型: 物品类型;
    品质: 物品品质;
    描述: string;
    价格估值: number;
    是否合理: boolean;
    不合理原因?: string;
}

export interface 物品提取结果 {
    是否有市场语义: boolean;
    是否有稀有物语义: boolean;
    提取的物品列表: 提取的物品信息[];
    主线类型?: 主线流向;
}

/**
 * 构建物品提取的 AI 提示词
 */
export const 构建物品提取提示词 = (responseText: string): string => {
    return `你是一个武侠游戏的物品分析专家。请分析以下游戏回合文本，提取其中可能进入拍卖行的物品信息。

## 分析规则

1. **市场语义识别**：
   - 明确提到"拍卖行"、"牙行"、"黑市"、"寄售"、"流入市面"、"市面流通"、"有人出货"、"暗中兜售"、"悬赏流出"、"上架"、"入市"等词汇
   - 这些词汇表明物品确实要进入交易市场
   - 必须是“这个具体物品”进入交易市场；如果只是玩家获得、玩家身边、玩家持有、枕边/手中/背包中的物品，不算市场语义

2. **稀有物语义识别**：
   - 明确提到"传说"、"绝世"、"极品"、"稀世"、"孤本"、"镇派"、"秘藏"、"神兵"、"残卷"、"宝库"、"遗迹"等词汇
   - 这些词汇表明物品具有稀有价值
   - 稀有物出现不等于可进入拍卖行；没有出售/上架/入市/黑市/摊客等流通语义时，不要提取为拍卖行物品

3. **物品名称提取**：
   - 只提取真实的物品名称，如"青锋剑"、"回春丹"、"玄铁矿"
   - 去掉前置修饰和描述，只保留核心物品名；例如"那件浆洗得有些发白的青云剑"应提取为"青云剑"
   - **不要提取**描述性短语，如"一股浓浓的药味"、"温热的触感"、"迅速驱散"
   - **不要提取**动作短语，如"快速移动"、"缓缓展开"
   - **不要提取**地点名称，如"西厢房"、"东厢房"

4. **物品类型判断**：
   - 武器：剑、刀、枪、弓、弩等
   - 防具：甲、衣、袍、护腕等
   - 饰品：佩、簪、珠、戒等
   - 消耗品：丹、药、散、酒、符等
   - 材料：矿、铁、砂、木等
   - 秘籍：秘籍、残卷、拓本、图谱等
   - 杂物：其他物品

5. **品质判断**：
   - 传说：神兵、天阶、绝代级别
   - 绝世：孤本、秘藏、镇派级别
   - 极品：上乘、珍品、稀世级别
   - 上品：精良、罕见级别
   - 良品：不错、可用级别
   - 凡品：普通、常见级别

6. **合理性检查**：
   - **杂物类型不能是传说、绝世、极品品质**（不合理）
   - 武器、防具、秘籍可以是任何品质（合理）
   - 消耗品、材料通常不超过极品品质（合理）

7. **价格估值**：
   - 传说：80000-100000 铜钱
   - 绝世：50000-60000 铜钱
   - 极品：20000-30000 铜钱
   - 上品：6000-10000 铜钱
   - 良品：2000-4000 铜钱
   - 凡品：500-1500 铜钱

## 回合文本

${responseText}

## 输出格式

请以 JSON 格式输出分析结果，格式如下：

\`\`\`json
{
  "是否有市场语义": true/false,
  "是否有稀有物语义": true/false,
  "主线类型": "秘境线" | "官府线" | "宗门线" | "江湖线" | null,
  "提取的物品列表": [
    {
      "名称": "物品名称",
      "类型": "武器" | "防具" | "饰品" | "消耗品" | "材料" | "秘籍" | "杂物",
      "品质": "传说" | "绝世" | "极品" | "上品" | "良品" | "凡品",
      "描述": "物品描述",
      "价格估值": 数字,
      "是否合理": true/false,
      "不合理原因": "如果不合理，说明原因"
    }
  ]
}
\`\`\`

**重要提示**：
- 如果文本中没有明确的市场语义或稀有物语义，"提取的物品列表"应该为空数组
- 如果文本只有玩家获得、看见、拿着、佩戴、放在枕边/身边/背包里的物品，即使物品稀有，也不能进入"提取的物品列表"
- 只有当具体物品被明确描述为出售、寄售、上架、流入市面、黑市兜售、摊客摆出等，才可进入"提取的物品列表"
- 只提取真实的物品名称，不要提取描述性短语
- 确保品质和类型的组合是合理的
- 如果无法确定主线类型，设置为 null`;
};

/**
 * 解析 AI 返回的物品提取结果
 */
export const 解析物品提取结果 = (aiResponse: string): 物品提取结果 | null => {
    try {
        // 尝试提取 JSON 代码块
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : aiResponse;
        
        const parsed = JSON.parse(jsonText);
        
        // 验证必需字段
        if (typeof parsed.是否有市场语义 !== 'boolean') {
            return null;
        }
        
        if (typeof parsed.是否有稀有物语义 !== 'boolean') {
            return null;
        }
        
        if (!Array.isArray(parsed.提取的物品列表)) {
            return null;
        }
        
        // 验证物品列表中的每个物品
        const validItems = parsed.提取的物品列表.filter((item: any) => {
            return (
                typeof item.名称 === 'string' &&
                typeof item.类型 === 'string' &&
                typeof item.品质 === 'string' &&
                typeof item.描述 === 'string' &&
                typeof item.价格估值 === 'number' &&
                typeof item.是否合理 === 'boolean'
            );
        });
        
        return {
            是否有市场语义: parsed.是否有市场语义,
            是否有稀有物语义: parsed.是否有稀有物语义,
            提取的物品列表: validItems,
            主线类型: parsed.主线类型 || undefined
        };
    } catch (error) {
        console.error('解析物品提取结果失败:', error);
        return null;
    }
};

/**
 * 从游戏响应中提取文本内容
 */
export const 从响应提取文本 = (response: GameResponse): string => {
    const logsText = Array.isArray(response?.logs)
        ? response.logs.map((log) => `${log?.sender || '旁白'}：${log?.text || ''}`).join('\n')
        : '';
    return [
        logsText,
        Array.isArray(response?.dynamic_world) ? response.dynamic_world.join('\n') : '',
        response?.shortTerm || '',
        response?.t_state || '',
        response?.t_branch || ''
    ].filter(Boolean).join('\n').trim();
};
