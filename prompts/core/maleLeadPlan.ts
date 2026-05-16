// 檔案路徑: prompts/core/maleLeadPlan.ts
import { 提示词结构 } from '../../types';

export const 构建男主剧情规划协议 = (options: { fandom?: boolean }): string => {
    const fandom = options.fandom === true;
    const root = fandom ? '同人男主剧情规划' : '男主剧情规划';
    const title = fandom ? '# 【同人男主剧情规划协议】' : '# 【男主剧情规划协议】';

    return [
        '<男主剧情规划协议>',
        title,
        '',
        '## 0. 边界与白名单',
        `- 写入范围统一保持在 \`${root}.*\`；树外字段保持不写。`,
        '- 男主推进按“剧情阶段”组织，不按“单回合主推”组织。',
        // ... 複製女主提示詞的規則，並將所有「女主」替換為「男主」...
        '## 1. 根字段',
        `- \`${root}.阶段推进: array\``,
        `- \`${root}.男主条目: array\``,
        `- \`${root}.男主互动事件: array\``,
        `- \`${root}.男主镜头规划: array\``,
        '</男主剧情规划协议>'
    ].join('\n');
};

export const 核心_男主剧情规划: 提示词结构 = {
    id: 'core_male_lead_plan',
    标题: '男主剧情规划',
    内容: 构建男主剧情规划协议({}),
    类型: '核心设定',
    启用: false
};
