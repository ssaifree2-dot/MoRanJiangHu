import {
    GameResponse,
    角色数据结构,
    环境信息结构,
    世界数据结构,
    战斗状态结构,
    详细门派结构,
    剧情系统结构,
    剧情规划结构,
    女主剧情规划结构,
    同人剧情规划结构,
    同人女主剧情规划结构
} from '../../types';
import { applyStateCommand, normalizeStateCommandKey } from '../../utils/stateHelpers';
import { 规范化任务列表自动结算 } from '../../utils/taskCompat';

export type 响应命令处理状态 = {
    角色: 角色数据结构;
    环境: 环境信息结构;
    社交: any[];
    世界: 世界数据结构;
    战斗: 战斗状态结构;
    玩家门派: 详细门派结构;
    任务列表: any[];
    约定列表: any[];
    剧情: 剧情系统结构;
    剧情规划: 剧情规划结构;
    女主剧情规划?: 女主剧情规划结构;
    同人剧情规划?: 同人剧情规划结构;
    同人女主剧情规划?: 同人女主剧情规划结构;
};

type 响应命令处理依赖 = {
    规范化环境信息: (envLike?: any) => 环境信息结构;
    规范化社交列表: (raw?: any[], options?: { 合并同名?: boolean }) => any[];
    规范化世界状态: (raw?: any) => 世界数据结构;
    规范化战斗状态: (raw?: any) => 战斗状态结构;
    规范化门派状态: (raw?: any) => 详细门派结构;
    规范化剧情状态: (raw?: any) => 剧情系统结构;
    规范化剧情规划状态: (raw?: any) => 剧情规划结构;
    规范化女主剧情规划状态: (raw?: any) => 女主剧情规划结构 | undefined;
    规范化同人剧情规划状态: (raw?: any) => 同人剧情规划结构 | undefined;
    规范化同人女主剧情规划状态: (raw?: any) => 同人女主剧情规划结构 | undefined;
    规范化角色物品容器映射: (raw?: any) => 角色数据结构;
    战斗结束自动清空: (battle: 战斗状态结构, story?: 剧情系统结构) => 战斗状态结构;
    设置角色?: (value: 角色数据结构) => void;
    设置环境?: (value: 环境信息结构) => void;
    设置社交?: (value: any[]) => void;
    设置世界?: (value: 世界数据结构) => void;
    设置战斗?: (value: 战斗状态结构) => void;
    设置玩家门派?: (value: 详细门派结构) => void;
    设置任务列表?: (value: any[]) => void;
    设置约定列表?: (value: any[]) => void;
    设置剧情?: (value: 剧情系统结构) => void;
    设置剧情规划?: (value: 剧情规划结构) => void;
    设置女主剧情规划?: (value: 女主剧情规划结构 | undefined) => void;
    设置同人剧情规划?: (value: 同人剧情规划结构 | undefined) => void;
    设置同人女主剧情规划?: (value: 同人女主剧情规划结构 | undefined) => void;
    命令后校准?: (state: 响应命令处理状态) => { state: 响应命令处理状态; corrections?: string[] } | 响应命令处理状态;
};

const 归一化文本键 = (value: unknown): string => (
    typeof value === 'string'
        ? value.trim().replace(/\s+/g, '').toLowerCase()
        : ''
);

const 是否对白NPC发送者 = (senderRaw: unknown, playerNameRaw: unknown): boolean => {
    const sender = typeof senderRaw === 'string' ? senderRaw.trim() : '';
    if (!sender) return false;
    if (/^【?(?:旁白|判定|NSFW判定|免责声明|系统|旁述|叙述|作者|提示|错误)】?$/i.test(sender)) return false;
    if (/^(?:disclaimer|system|narrator|assistant|user)$/i.test(sender)) return false;
    const playerName = 归一化文本键(playerNameRaw);
    if (playerName && 归一化文本键(sender) === playerName) return false;
    return sender.length <= 16;
};

const 稳定哈希文本 = (text: string): string => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};

const 补入对白发送者到社交 = (
    response: GameResponse,
    socialList: any[],
    playerName?: string
): any[] => {
    const logs = Array.isArray(response?.logs) ? response.logs : [];
    if (logs.length <= 0) return socialList;

    const existingKeys = new Set(
        (Array.isArray(socialList) ? socialList : [])
            .flatMap((npc: any) => [npc?.id, npc?.姓名, npc?.名称])
            .map(归一化文本键)
            .filter(Boolean)
    );
    const dialogueNameKeys = new Set<string>();
    const pendingNames: string[] = [];
    logs.forEach((log: any) => {
        const sender = typeof log?.sender === 'string' ? log.sender.trim() : '';
        const key = 归一化文本键(sender);
        if (!是否对白NPC发送者(sender, playerName)) return;
        dialogueNameKeys.add(key);
        if (existingKeys.has(key)) return;
        existingKeys.add(key);
        pendingNames.push(sender);
    });

    const markedSocialList = (Array.isArray(socialList) ? socialList : []).map((npc: any) => {
        const keys = [npc?.id, npc?.姓名, npc?.名称].map(归一化文本键).filter(Boolean);
        if (!keys.some((key) => dialogueNameKeys.has(key))) return npc;
        return {
            ...npc,
            对白登场: true,
            自动补全头像: true
        };
    });

    if (pendingNames.length <= 0) return markedSocialList;
    const inferredNpcs = pendingNames.map((name) => ({
        id: `npc_dialogue_${稳定哈希文本(name)}`,
        姓名: name,
        性别: '未知',
        年龄: undefined,
        境界: '未知境界',
        身份: '剧情对话人物',
        是否在场: true,
        是否队友: false,
        是否主要角色: false,
        对白登场: true,
        自动补全头像: true,
        好感度: 0,
        关系状态: '初识',
        简介: `在剧情对话中登场的人物：${name}。`,
        记忆: []
    }));
    return [...markedSocialList, ...inferredNpcs];
};

const 装备槽位列表 = ['头部', '胸部', '盔甲', '内衬', '腿部', '手部', '足部', '主武器', '副武器', '暗器', '背部', '腰部', '坐骑'] as const;
type 装备槽位 = typeof 装备槽位列表[number];
const 装备槽位集合 = new Set<string>(装备槽位列表);

const 是空装备值 = (value: unknown): boolean => (
    value === undefined
    || value === null
    || (typeof value === 'string' && /^(?:|无|空置|空|none|null|undefined)$/i.test(value.trim()))
);

const 提取响应事实文本 = (response: GameResponse): string => {
    const parts: string[] = [];
    if (typeof (response as any)?.body === 'string') parts.push((response as any).body);
    if (typeof (response as any)?.正文 === 'string') parts.push((response as any).正文);
    if (typeof (response as any)?.summary === 'string') parts.push((response as any).summary);
    if (Array.isArray(response?.logs)) {
        response.logs.forEach((log: any) => {
            if (typeof log?.content === 'string') parts.push(log.content);
            if (typeof log?.text === 'string') parts.push(log.text);
            if (typeof log?.message === 'string') parts.push(log.message);
        });
    }
    return parts.join('\n');
};

const 装备移除触发正则 = /(卸下|脱下|取下|摘下|换下|换装|更换|丢弃|扔掉|遗弃|卖出|售卖|出售|卖给|卖了|卖掉|上架|典当|赠予|交给|交出|缴械|被夺|夺走|抢走|没收|遗失|失落|掉落|损坏|毁坏|破碎|断裂|烧毁|腐蚀|消耗|报废|解除装备|卸除装备)/;

const 命令是否有装备移除触发 = (cmd: any, responseFactText: string): boolean => {
    const commandText = [
        cmd?.key,
        typeof cmd?.value === 'string' ? cmd.value : '',
        typeof cmd?.reason === 'string' ? cmd.reason : '',
        typeof cmd?.原因 === 'string' ? cmd.原因 : '',
        typeof cmd?.说明 === 'string' ? cmd.说明 : '',
        responseFactText
    ].filter(Boolean).join('\n');
    return 装备移除触发正则.test(commandText);
};

const 净化角色装备命令 = (
    cmd: any,
    currentEquipment: Record<string, any>,
    responseFactText: string
): any | null => {
    const normalizedKey = normalizeStateCommandKey(typeof cmd?.key === 'string' ? cmd.key : '');
    if (!normalizedKey.startsWith('gameState.角色.装备')) return cmd;
    const action = (cmd?.action || 'set') as string;
    const allowRemoval = 命令是否有装备移除触发(cmd, responseFactText);
    if (allowRemoval) return cmd;

    const rest = normalizedKey.slice('gameState.角色.装备'.length).replace(/^\./, '');
    if (!rest) {
        if (action === 'delete') return null;
        if (cmd?.value && typeof cmd.value === 'object' && !Array.isArray(cmd.value)) {
            const nextValue = { ...cmd.value };
            let changed = false;
            装备槽位列表.forEach((slot) => {
                if (!(slot in nextValue)) return;
                if (!是空装备值(nextValue[slot])) return;
                if (是空装备值(currentEquipment?.[slot])) return;
                nextValue[slot] = currentEquipment[slot];
                changed = true;
            });
            return changed ? { ...cmd, value: nextValue } : cmd;
        }
        if (是空装备值(cmd?.value) && Object.values(currentEquipment || {}).some((value) => !是空装备值(value))) {
            return null;
        }
        return cmd;
    }

    const slot = rest.split(/[.\[]/, 1)[0];
    if (!装备槽位集合.has(slot)) return cmd;
    if ((action === 'delete' || 是空装备值(cmd?.value)) && !是空装备值(currentEquipment?.[slot])) {
        return null;
    }
    return cmd;
};

export const 执行响应命令处理 = (
    response: GameResponse,
    currentState: 响应命令处理状态,
    deps: 响应命令处理依赖,
    baseState?: Partial<响应命令处理状态>,
    options?: {
        applyState?: boolean;
    }
): 响应命令处理状态 => {
    const shouldApplyState = options?.applyState !== false;
    let charBuffer = baseState?.角色 || currentState.角色;
    let envBuffer = deps.规范化环境信息(baseState?.环境 || currentState.环境);
    let socialBuffer = Array.isArray(baseState?.社交) ? baseState.社交 : currentState.社交;
    let worldBuffer = deps.规范化世界状态(baseState?.世界 || currentState.世界);
    let battleBuffer = deps.规范化战斗状态(baseState?.战斗 || currentState.战斗);
    let sectBuffer = deps.规范化门派状态(baseState?.玩家门派 || currentState.玩家门派);
    let tasksBuffer = Array.isArray(baseState?.任务列表) ? baseState.任务列表 : currentState.任务列表;
    let agreementsBuffer = Array.isArray(baseState?.约定列表) ? baseState.约定列表 : currentState.约定列表;
    let storyBuffer = deps.规范化剧情状态(baseState?.剧情 || currentState.剧情);
    let storyPlanBuffer = deps.规范化剧情规划状态(baseState?.剧情规划 || currentState.剧情规划);
    let heroinePlanBuffer = deps.规范化女主剧情规划状态(baseState?.女主剧情规划 ?? currentState.女主剧情规划);
    let fandomStoryPlanBuffer = deps.规范化同人剧情规划状态(baseState?.同人剧情规划 ?? currentState.同人剧情规划);
    let fandomHeroinePlanBuffer = deps.规范化同人女主剧情规划状态(baseState?.同人女主剧情规划 ?? currentState.同人女主剧情规划);

    if (Array.isArray(response.tavern_commands)) {
        const responseFactText = 提取响应事实文本(response);
        response.tavern_commands.forEach(cmd => {
            const safeCmd = 净化角色装备命令(cmd, charBuffer?.装备 || {}, responseFactText);
            if (!safeCmd) return;
            const result = applyStateCommand(
                charBuffer,
                envBuffer,
                socialBuffer,
                worldBuffer,
                battleBuffer,
                storyBuffer,
                storyPlanBuffer,
                heroinePlanBuffer,
                fandomStoryPlanBuffer,
                fandomHeroinePlanBuffer,
                sectBuffer,
                tasksBuffer,
                agreementsBuffer,
                safeCmd.key,
                safeCmd.value,
                safeCmd.action
            );
            charBuffer = result.char;
            envBuffer = result.env;
            socialBuffer = result.social;
            worldBuffer = result.world;
            battleBuffer = result.battle;
            sectBuffer = result.sect;
            tasksBuffer = Array.isArray(result.tasks) ? result.tasks : [];
            agreementsBuffer = Array.isArray(result.agreements) ? result.agreements : [];
            storyBuffer = result.story;
            storyPlanBuffer = result.storyPlan;
            heroinePlanBuffer = result.heroinePlan;
            fandomStoryPlanBuffer = result.fandomStoryPlan;
            fandomHeroinePlanBuffer = result.fandomHeroinePlan;
        });

        envBuffer = deps.规范化环境信息(envBuffer);
        socialBuffer = deps.规范化社交列表(socialBuffer, { 合并同名: false });
        worldBuffer = deps.规范化世界状态(worldBuffer);
        sectBuffer = deps.规范化门派状态(sectBuffer);
        storyPlanBuffer = deps.规范化剧情规划状态(storyPlanBuffer);
        heroinePlanBuffer = deps.规范化女主剧情规划状态(heroinePlanBuffer);
        fandomStoryPlanBuffer = deps.规范化同人剧情规划状态(fandomStoryPlanBuffer);
        fandomHeroinePlanBuffer = deps.规范化同人女主剧情规划状态(fandomHeroinePlanBuffer);

        battleBuffer = deps.战斗结束自动清空(battleBuffer, storyBuffer);
        charBuffer = deps.规范化角色物品容器映射(charBuffer);
        socialBuffer = deps.规范化社交列表(
            补入对白发送者到社交(response, socialBuffer, charBuffer?.姓名),
            { 合并同名: false }
        );
        storyBuffer = deps.规范化剧情状态(storyBuffer);

        let finalState: 响应命令处理状态 = {
            角色: charBuffer,
            环境: deps.规范化环境信息(envBuffer),
            社交: socialBuffer,
            世界: deps.规范化世界状态(worldBuffer),
            战斗: battleBuffer,
            玩家门派: deps.规范化门派状态(sectBuffer),
            任务列表: 规范化任务列表自动结算(Array.isArray(tasksBuffer) ? tasksBuffer : []),
            约定列表: Array.isArray(agreementsBuffer) ? agreementsBuffer : [],
            剧情: storyBuffer,
            剧情规划: deps.规范化剧情规划状态(storyPlanBuffer),
            女主剧情规划: deps.规范化女主剧情规划状态(heroinePlanBuffer),
            同人剧情规划: deps.规范化同人剧情规划状态(fandomStoryPlanBuffer),
            同人女主剧情规划: deps.规范化同人女主剧情规划状态(fandomHeroinePlanBuffer)
        };
        const calibrated = deps.命令后校准?.(finalState);
        if (calibrated) {
            finalState = 'state' in calibrated ? calibrated.state : calibrated;
        }

        if (shouldApplyState) {
            deps.设置角色?.(finalState.角色);
            deps.设置环境?.(finalState.环境);
            deps.设置社交?.(finalState.社交);
            deps.设置世界?.(finalState.世界);
            deps.设置战斗?.(finalState.战斗);
            deps.设置玩家门派?.(finalState.玩家门派);
            deps.设置任务列表?.(finalState.任务列表);
            deps.设置约定列表?.(finalState.约定列表);
            deps.设置剧情?.(finalState.剧情);
            deps.设置剧情规划?.(finalState.剧情规划);
            deps.设置女主剧情规划?.(finalState.女主剧情规划);
            deps.设置同人剧情规划?.(finalState.同人剧情规划);
            deps.设置同人女主剧情规划?.(finalState.同人女主剧情规划);
        }

        return finalState;
    }

    let finalState: 响应命令处理状态 = {
        角色: charBuffer,
        环境: deps.规范化环境信息(envBuffer),
        社交: deps.规范化社交列表(
            补入对白发送者到社交(response, socialBuffer, charBuffer?.姓名),
            { 合并同名: false }
        ),
        世界: deps.规范化世界状态(worldBuffer),
        战斗: battleBuffer,
        玩家门派: deps.规范化门派状态(sectBuffer),
        任务列表: 规范化任务列表自动结算(Array.isArray(tasksBuffer) ? tasksBuffer : []),
        约定列表: Array.isArray(agreementsBuffer) ? agreementsBuffer : [],
        剧情: deps.规范化剧情状态(storyBuffer),
        剧情规划: deps.规范化剧情规划状态(storyPlanBuffer),
        女主剧情规划: deps.规范化女主剧情规划状态(heroinePlanBuffer),
        同人剧情规划: deps.规范化同人剧情规划状态(fandomStoryPlanBuffer),
        同人女主剧情规划: deps.规范化同人女主剧情规划状态(fandomHeroinePlanBuffer)
    };
    const calibrated = deps.命令后校准?.(finalState);
    if (calibrated) {
        finalState = 'state' in calibrated ? calibrated.state : calibrated;
        if (shouldApplyState) {
            deps.设置角色?.(finalState.角色);
            deps.设置环境?.(finalState.环境);
            deps.设置社交?.(finalState.社交);
            deps.设置世界?.(finalState.世界);
            deps.设置战斗?.(finalState.战斗);
            deps.设置玩家门派?.(finalState.玩家门派);
            deps.设置任务列表?.(finalState.任务列表);
            deps.设置约定列表?.(finalState.约定列表);
            deps.设置剧情?.(finalState.剧情);
            deps.设置剧情规划?.(finalState.剧情规划);
            deps.设置女主剧情规划?.(finalState.女主剧情规划);
            deps.设置同人剧情规划?.(finalState.同人剧情规划);
            deps.设置同人女主剧情规划?.(finalState.同人女主剧情规划);
        }
    };
    return finalState;
};
