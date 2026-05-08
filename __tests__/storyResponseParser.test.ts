import { describe, expect, it } from 'vitest';
import { parseStoryRawText } from '../services/ai/storyResponseParser';

describe('storyResponseParser', () => {
    it('does not fold variable plan or short memory into body fallback', () => {
        const parsed = parseStoryRawText([
            '<变量规划>',
            '角色状态需要初始化。',
            '</变量规划>',
            '正文：',
            '【旁白】忠伯推开柴门，向院中望去。',
            '短期记忆：',
            '忠伯在院中现身。',
            '命令：',
            'set 环境.具体地点 = "柴门小院"'
        ].join('\n'), { enableTagRepair: false });

        expect(parsed.logs).toEqual([
            { sender: '旁白', text: '忠伯推开柴门，向院中望去。' }
        ]);
        expect(parsed.t_var_plan).toBe('角色状态需要初始化。');
        expect(parsed.shortTerm).toBe('忠伯在院中现身。');
    });

    it('cuts residual protocol blocks out of a malformed body block', () => {
        const parsed = parseStoryRawText([
            '<正文>',
            '【旁白】忠伯推开柴门，向院中望去。',
            '短期记忆：',
            '忠伯在院中现身。',
            '变量规划：',
            '环境地点发生变化。',
            '</正文>',
            '<短期记忆>忠伯在院中现身。</短期记忆>'
        ].join('\n'));

        expect(parsed.logs).toEqual([
            { sender: '旁白', text: '忠伯推开柴门，向院中望去。' }
        ]);
        expect(parsed.shortTerm).toBe('忠伯在院中现身。');
    });
});
