import type { 生图任务来源类型, 角色数据结构 } from '../../types';
import type { 当前可用接口结构 } from '../../utils/apiConfig';
import { 获取图片展示地址 } from '../../utils/imageAssets';
import { 主角角色锚点标识 } from './imagePresetWorkflow';
import { 合并NPC图片档案 } from './npcImageStateWorkflow';

type 主角生图选项 = {
    构图?: '头像' | '半身' | '立绘';
    画风?: 当前可用接口结构['画风'];
    画师串?: string;
    画师串预设ID?: string;
    PNG画风预设ID?: string;
    额外要求?: string;
    尺寸?: string;
};

type 主角图片工作流依赖 = {
    获取角色: () => 角色数据结构;
    设置角色: (updater: (prev: 角色数据结构) => 角色数据结构) => void;
    规范化角色物品容器映射: (raw?: any) => 角色数据结构;
    执行自动存档: (snapshot?: { role?: 角色数据结构; history?: any[]; force?: boolean }) => Promise<unknown> | unknown;
    获取历史记录: () => any[];
    推送右下角提示: (toast: { title: string; message: string; tone?: 'info' | 'success' | 'error' }) => void;
    加载NPC生图工作流: () => Promise<any>;
    apiConfig: any;
    获取文生图接口配置: (config: any) => 当前可用接口结构 | null;
    获取生图词组转化器接口配置: (config: any) => 当前可用接口结构 | null;
    获取生图画师串预设: (config: any, scope: 'npc' | 'scene', preferredId?: string) => any;
    获取当前PNG画风预设: (presetId?: string) => any;
    读取主角角色锚点: () => any;
    提取主角角色锚点: (options?: { 名称?: string; 额外要求?: string }) => Promise<any>;
    获取词组转化器预设提示词: (config: any, scope: 'npc' | 'scene', mode?: 'default' | 'anchor') => string;
    接口配置是否可用: (config: 当前可用接口结构) => boolean;
    读取文生图功能配置: () => any;
    主角生图进行中集合: Set<string>;
    提取主角生图基础数据: (character: 角色数据结构) => any;
    创建NPC生图任务: (params: any) => any;
    生成NPC生图记录ID: () => string;
    追加NPC生图任务: (task: any) => void;
    更新NPC生图任务: (taskId: string, updater: (task: any) => any) => void;
    构建文生图额外要求: (extra?: string) => string;
};

export const 创建主角图片工作流 = (deps: 主角图片工作流依赖) => {
    const 主角锚点是否匹配当前角色 = (anchor: any, playerSnapshot: 角色数据结构): boolean => {
        if (!anchor) return false;
        const currentGender = typeof playerSnapshot?.性别 === 'string' ? playerSnapshot.性别.trim() : '';
        const rawText = typeof anchor?.原始提取文本 === 'string' ? anchor.原始提取文本.trim() : '';
        if (!currentGender || !rawText) return true;
        try {
            const raw = JSON.parse(rawText);
            const anchorGender = typeof raw?.性别 === 'string' ? raw.性别.trim() : '';
            return !anchorGender || anchorGender === currentGender;
        } catch {
            return true;
        }
    };

    const 更新角色并自动存档 = (updater: (prev: 角色数据结构) => 角色数据结构) => {
        let snapshot: 角色数据结构 | null = null;
        deps.设置角色((prev) => {
            const next = deps.规范化角色物品容器映射(updater(prev));
            snapshot = next;
            return next;
        });
        if (snapshot) {
            void deps.执行自动存档({ role: snapshot, history: deps.获取历史记录(), force: true });
        }
    };

    const 更新玩家最近生图结果 = (updater: (player: 角色数据结构) => any) => {
        更新角色并自动存档((prev) => {
            const nextPlayer = updater(prev);
            const 图片档案 = 合并NPC图片档案(prev, nextPlayer);
            return {
                ...nextPlayer,
                图片档案,
                最近生图结果: 图片档案?.最近生图结果
            };
        });
    };

    const 更新玩家选图字段 = (
        field: '已选头像图片ID' | '已选立绘图片ID' | '已选背景图片ID',
        imageId?: string,
        validator?: (history: any[]) => boolean
    ) => {
        更新角色并自动存档((prev) => {
            const archive = prev?.图片档案 && typeof prev.图片档案 === 'object' ? prev.图片档案 : {};
            const history = Array.isArray(archive?.生图历史) ? archive.生图历史 : [];
            if (imageId) {
                const valid = validator ? validator(history) : true;
                if (!valid) return prev;
            } else if (typeof archive?.[field] !== 'string' || !archive[field]?.trim()) {
                return prev;
            }
            return {
                ...prev,
                图片档案: {
                    ...archive,
                    最近生图结果: archive?.最近生图结果 || prev?.最近生图结果,
                    生图历史: history,
                    [field]: imageId || undefined
                }
            };
        });
    };

    const updatePlayerAvatar = (imageUrl: string) => {
        更新角色并自动存档((prev) => ({
            ...prev,
            头像图片URL: typeof imageUrl === 'string' ? imageUrl : '',
            图片档案: prev?.图片档案 ? { ...prev.图片档案, 已选头像图片ID: undefined } : prev?.图片档案
        }));
    };

    const selectPlayerAvatarImage = (imageId: string) => 更新玩家选图字段(
        '已选头像图片ID',
        imageId,
        (history) => Boolean(history.find((item: any) => item?.id === imageId && item?.构图 === '头像' && item?.状态 === 'success' && 获取图片展示地址(item)))
    );

    const clearPlayerAvatarImage = () => 更新玩家选图字段('已选头像图片ID');

    const selectPlayerPortraitImage = (imageId: string) => 更新玩家选图字段(
        '已选立绘图片ID',
        imageId,
        (history) => Boolean(history.find((item: any) => item?.id === imageId && (item?.构图 === '半身' || item?.构图 === '立绘') && item?.状态 === 'success' && 获取图片展示地址(item)))
    );

    const clearPlayerPortraitImage = () => 更新玩家选图字段('已选立绘图片ID');

    const removePlayerImageRecord = (imageId: string) => {
        if (!imageId) return;
        更新角色并自动存档((prev) => {
            const archive = prev?.图片档案 && typeof prev.图片档案 === 'object' ? prev.图片档案 : {};
            const currentHistory = Array.isArray(archive?.生图历史)
                ? archive.生图历史.filter((item: any) => item && typeof item === 'object')
                : (prev?.最近生图结果 ? [prev.最近生图结果] : []);
            const nextHistory = currentHistory.filter((item: any) => item?.id !== imageId);
            if (nextHistory.length === currentHistory.length) return prev;
            const currentSelectedAvatarImageId = typeof archive?.已选头像图片ID === 'string' ? archive.已选头像图片ID.trim() : '';
            const currentSelectedPortraitImageId = typeof archive?.已选立绘图片ID === 'string' ? archive.已选立绘图片ID.trim() : '';
            const currentSelectedBackgroundImageId = typeof archive?.已选背景图片ID === 'string' ? archive.已选背景图片ID.trim() : '';
            const nextRecent = nextHistory[0];
            const nextSelectedAvatarImageId = currentSelectedAvatarImageId && nextHistory.some((item: any) => item?.id === currentSelectedAvatarImageId)
                ? currentSelectedAvatarImageId
                : (nextHistory.find((item: any) => item?.构图 === '头像' && item?.状态 === 'success' && item?.id)?.id
                    || nextHistory.find((item: any) => item?.构图 !== '部位特写' && item?.状态 === 'success' && item?.id)?.id
                    || undefined);
            return {
                ...prev,
                图片档案: nextHistory.length > 0 ? {
                    最近生图结果: nextRecent,
                    生图历史: nextHistory,
                    已选头像图片ID: nextSelectedAvatarImageId,
                    已选立绘图片ID: currentSelectedPortraitImageId === imageId ? undefined : currentSelectedPortraitImageId,
                    已选背景图片ID: currentSelectedBackgroundImageId === imageId ? undefined : currentSelectedBackgroundImageId
                } : undefined,
                最近生图结果: nextRecent
            };
        });
    };

    const generatePlayerImage = async (
        options?: 主角生图选项,
        meta?: { source?: 生图任务来源类型; showToast?: boolean; playerSnapshot?: 角色数据结构 }
    ) => {
        const playerSnapshot = meta?.playerSnapshot || deps.获取角色();
        const playerName = typeof playerSnapshot?.姓名 === 'string' && playerSnapshot.姓名.trim() ? playerSnapshot.姓名.trim() : '主角';
        const existingAnchor = deps.读取主角角色锚点();
        if (!existingAnchor || !主角锚点是否匹配当前角色(existingAnchor, playerSnapshot)) {
            try {
                await deps.提取主角角色锚点({
                    名称: `${playerName} 角色锚点`
                });
            } catch (error) {
                console.warn('主角生图前置锚点提取失败，继续使用基础资料生图', error);
            }
        }
        if (meta?.showToast !== false) {
            deps.推送右下角提示({
                title: '主角生图已提交',
                message: `${playerName}的${options?.构图 || '头像'}已进入生成流程。`,
                tone: 'info'
            });
        }
        try {
            const { 执行NPC生图工作流 } = await deps.加载NPC生图工作流();
            await 执行NPC生图工作流({
                id: 主角角色锚点标识,
                姓名: playerName,
                性别: playerSnapshot?.性别,
                年龄: playerSnapshot?.年龄,
                身份: playerSnapshot?.称号 || playerSnapshot?.出身背景?.名称,
                境界: playerSnapshot?.境界,
                简介: playerSnapshot?.出身背景?.描述,
                外貌: playerSnapshot?.外貌,
                性格: playerSnapshot?.性格
            }, {
                force: true,
                source: meta?.source || 'manual',
                ...options,
                额外要求: deps.构建文生图额外要求(options?.额外要求)
            }, {
                apiConfig: deps.apiConfig,
                获取NPC唯一标识: () => `id:${主角角色锚点标识}:${options?.构图 || '头像'}`,
                获取文生图接口配置: deps.获取文生图接口配置,
                获取生图词组转化器接口配置: deps.获取生图词组转化器接口配置,
                获取生图画师串预设: deps.获取生图画师串预设,
                获取当前PNG画风预设: deps.获取当前PNG画风预设,
                获取NPC角色锚点: () => {
                    const anchor = deps.读取主角角色锚点();
                    if (!anchor || anchor.生成时默认附加 !== true) return null;
                    if (!主角锚点是否匹配当前角色(anchor, playerSnapshot)) return null;
                    return anchor;
                },
                获取词组转化器预设提示词: deps.获取词组转化器预设提示词,
                接口配置是否可用: deps.接口配置是否可用,
                读取文生图功能配置: deps.读取文生图功能配置,
                NPC符合自动生图条件: () => true,
                NPC生图进行中集合: deps.主角生图进行中集合,
                提取NPC生图基础数据: () => deps.提取主角生图基础数据(playerSnapshot),
                创建NPC生图任务: (params: any) => ({ ...deps.创建NPC生图任务(params), id: `player_image_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` }),
                生成NPC生图记录ID: deps.生成NPC生图记录ID,
                追加NPC生图任务: deps.追加NPC生图任务,
                更新NPC生图任务: deps.更新NPC生图任务,
                更新NPC最近生图结果: (_npcKey: string, updater: (player: 角色数据结构) => any) => 更新玩家最近生图结果(updater)
            });
            if (meta?.showToast !== false) {
                deps.推送右下角提示({
                    title: '主角生图完成',
                    message: `${playerName}的${options?.构图 || '头像'}已写入主角图片档案。`,
                    tone: 'success'
                });
            }
        } catch (error: any) {
            const message = typeof error?.message === 'string' && error.message.trim() ? error.message.trim() : '主角生图失败';
            if (meta?.showToast !== false) {
                deps.推送右下角提示({ title: '主角生图失败', message, tone: 'error' });
            }
            throw error;
        }
    };

    const generatePlayerImageManually = async (options?: 主角生图选项) => {
        await generatePlayerImage(options, { source: 'manual', showToast: true });
    };

    const generatePlayerImagesAutomatically = async (playerSnapshot?: 角色数据结构) => {
        const imageFeature = deps.读取文生图功能配置();
        if (!imageFeature?.总开关) return;
        const targets: 主角生图选项[] = [
            { 构图: '头像', 额外要求: '开局自动生成主角头像，强调面部辨识度、清晰五官与稳定角色特征。' },
            { 构图: '半身', 额外要求: '开局自动生成主角半身像，强调上半身服饰、姿态、气质与身份辨识。' },
            { 构图: '立绘', 额外要求: '开局自动生成主角全身立绘，强调完整服饰、体态、武侠气质与角色稳定外观。' }
        ];
        let failedCount = 0;
        for (const target of targets) {
            try {
                await generatePlayerImage(target, {
                    source: 'auto',
                    showToast: false,
                    playerSnapshot
                });
            } catch {
                failedCount += 1;
            }
        }
        if (failedCount > 0 && failedCount < targets.length) {
            deps.推送右下角提示({
                title: '主角开局生图部分完成',
                message: `已完成部分主角影像，另有 ${failedCount} 项生成失败，可稍后在主角生图中重试。`,
                tone: 'info'
            });
        } else if (failedCount === targets.length) {
            deps.推送右下角提示({
                title: '主角开局生图失败',
                message: '头像、半身与立绘均未生成成功，请检查文生图接口后重试。',
                tone: 'error'
            });
        }
    };

    return {
        updatePlayerAvatar,
        selectPlayerAvatarImage,
        clearPlayerAvatarImage,
        selectPlayerPortraitImage,
        clearPlayerPortraitImage,
        removePlayerImageRecord,
        generatePlayerImageManually,
        generatePlayerImagesAutomatically
    };
};
