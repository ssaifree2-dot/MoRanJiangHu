import { 构建世界书注入文本 } from './worldbook';
import { 按功能开关过滤提示词内容, 裁剪修炼体系上下文数据 } from './promptFeatureToggles';
import { 构建世界演变上下文文本, 规范化世界演变命令列表 } from '../hooks/useGame/worldEvolutionUtils';
import { 构建系统提示词 } from '../hooks/useGame/systemPromptBuilder';

type WorkerRequest = {
    id: number;
    type: string;
    payload: any;
};

const 处理任务 = (type: string, payload: any): any => {
    switch (type) {
        case 'buildWorldbookText':
            return 按功能开关过滤提示词内容(
                构建世界书注入文本(payload?.worldbookParams || {}).combinedText,
                payload?.gameConfig
            );
        case 'stringifyTrimCultivation':
            return JSON.stringify(
                裁剪修炼体系上下文数据(payload?.value, payload?.gameConfig),
                null,
                Number.isFinite(Number(payload?.space)) ? Number(payload.space) : 2
            );
        case 'buildWorldEvolutionContext':
            return 构建世界演变上下文文本(payload || {});
        case 'normalizeWorldEvolutionCommands':
            return 规范化世界演变命令列表(payload?.commands || []);
        case 'buildSystemPrompt':
            return 构建系统提示词(payload || {});
        default:
            throw new Error(`未知后台任务：${type}`);
    }
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const { id, type, payload } = event.data || {};
    try {
        const result = 处理任务(type, payload);
        self.postMessage({ id, ok: true, result });
    } catch (error: any) {
        self.postMessage({
            id,
            ok: false,
            error: error?.message || String(error || '后台任务失败')
        });
    }
};

export {};
