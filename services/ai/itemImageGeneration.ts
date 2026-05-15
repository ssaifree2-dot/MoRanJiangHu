import type { 接口设置结构, 物品生图结果 } from '../../types';
import type { 游戏物品 } from '../../models/item';
import type { 当前可用接口结构 } from '../../utils/apiConfig';
import { 获取文生图接口配置, 接口配置是否可用 } from '../../utils/apiConfig';
import { 合并物品图片档案 } from '../../utils/itemImage';
import { 默认NSFWComfyUI工作流JSON } from '../../data/defaultComfyWorkflow';
import { generateImageByPrompt, persistImageAssetLocally } from './image';

type 物品生图来源位置 = '背包' | '拍卖行';

export interface 物品图标生成选项 {
    source?: 'auto' | 'manual' | 'retry';
    sourceLocation?: 物品生图来源位置;
    force?: boolean;
    size?: string;
    imageApi?: 当前可用接口结构 | null;
    signal?: AbortSignal;
    recordId?: string;
}

export interface 物品图标生成结果 {
    nextItem: 游戏物品;
    imageRecord: 物品生图结果;
    prompt: string;
    imageApi: 当前可用接口结构;
}

const 读取文本 = (value: unknown, fallback = '') => (
    typeof value === 'string' ? value.trim() : fallback
);

const 构建物品生图接口配置 = (imageApi: 当前可用接口结构 | null): 当前可用接口结构 | null => {
    if (!imageApi) return null;
    if (imageApi?.图片后端类型 !== 'comfyui') return imageApi;
    const workflow = 读取文本(imageApi.ComfyUI工作流JSON);
    // 当前 CNB 的 NunchakuZImageDiTLoader 对部分 z_image_turbo_bf16 模型会抛 KeyError: 'weight'。
    // 物品图标优先稳定产出，因此避开该节点，复用已验证可执行的 mPMix + Lightning 工作流。
    if (!/NunchakuZImageDiTLoader/i.test(workflow)) return imageApi;
    return {
        ...imageApi,
        ComfyUI工作流JSON: 默认NSFWComfyUI工作流JSON
    };
};

/**
 * 仅用于写入 `视觉描述` 字段的原始文本。
 * 注意：物品生图的 prompt 必须避免出现"名称:X 类型:Y 品质:Z"这种结构化中文键值对，
 * 否则大量模型会直接把它当成要画在图上的文字/标签 (历史事故：青钢剑图上出现 "名称:青钢剑 类型:武型 品质:良品")。
 * 这里只保留描述性自然语言，不保留字段标签。
 */
export const 构建物品视觉描述 = (item: any): string => {
    const parts: string[] = [];
    const 描述 = 读取文本(item?.描述);
    if (描述) parts.push(描述);
    if (Array.isArray(item?.词条列表) && item.词条列表.length > 0) {
        const 词条文案 = item.词条列表
            .map((entry: any) => [entry?.名称, entry?.属性, entry?.数值].filter(Boolean).join(' '))
            .filter(Boolean)
            .join('；');
        if (词条文案) parts.push(词条文案);
    }
    const 来源 = 读取文本(item?.来源描述);
    if (来源) parts.push(来源);
    const 关联 = 读取文本(item?.关联事件);
    if (关联) parts.push(关联);
    return parts.join('\n');
};

const 获取渲染风格要求 = (style: string): string => {
    switch (style) {
        case '写实道具':
            return 'photorealistic single prop product photography, isolated physical object, real metal leather cloth wood or paper materials, studio lighting, tactile surface detail, neutral matte background, clean product composition';
        case '像素图标':
            return 'high-end pixel art item icon, crisp silhouette, readable at small size, clean transparent-style asset presentation';
        case '3D渲染':
            return 'stylized 3D single prop render, centered product lighting, soft shadow, clean asset presentation';
        case '国风插画':
        default:
            return 'Chinese wuxia illustration style, ink wash texture, refined golden rim light';
    }
};

const 物品类型转英文 = (type: string): string => {
    const map: Record<string, string> = {
        '武器': 'weapon', '武型': 'weapon', '剑': 'sword', '刀': 'saber',
        '防具': 'armor', '盔甲': 'armor', '衣服': 'garment',
        '消耗品': 'consumable', '丹药': 'medicinal pill', '药': 'medicine',
        '材料': 'crafting material', '符箓': 'talisman', '秘籍': 'scroll',
        '任务': 'key item', '杂物': 'miscellaneous object',
        '饰品': 'accessory', '暗器': 'hidden weapon'
    };
    for (const [cn, en] of Object.entries(map)) {
        if (type.includes(cn)) return en;
    }
    return 'prop';
};

const 物品名称是否柔性服装 = (name: string): boolean => (
    /练功服|武服|劲装|布衣|布衫|青衫|衣服|衣裳|衣物|长衫|短衫|衫|袍|道袍|僧衣|寝衣|内衬|内衣|裤|长裤|短裤|裙|鞋|靴|袜|披风|斗篷|罩衫|外袍|长袍|便服|常服/.test(name)
);

const 物品是否柔性服装 = (item: any): boolean => {
    const name = 读取文本(item?.名称);
    if (物品名称是否柔性服装(name)) return true;
    const type = 读取文本(item?.类型);
    const equipSlot = [
        item?.装备位置,
        item?.当前装备部位,
        Array.isArray(item?.覆盖部位) ? item.覆盖部位.join(' ') : item?.覆盖部位
    ].map((value) => 读取文本(value)).join(' ');
    return /衣服|服装|内衬|鞋履/.test(type)
        || (/内衬|腿部|足部|胸部/.test(equipSlot) && 物品名称是否柔性服装(`${name}${equipSlot}`));
};

const 物品是否布鞋 = (item: any): boolean => {
    const text = [
        item?.名称,
        item?.类型,
        item?.装备位置,
        item?.当前装备部位,
        item?.描述,
        item?.视觉描述,
        Array.isArray(item?.视觉标签) ? item.视觉标签.join(' ') : ''
    ].map((value) => 读取文本(value)).join(' ');
    return /布鞋|旧布鞋|千层底|布靴|麻鞋|草鞋/.test(text);
};

const 物品是否坐骑生物 = (item: any): boolean => {
    const text = [
        item?.名称,
        item?.类型,
        item?.装备位置,
        item?.当前装备部位,
        item?.描述,
        item?.视觉描述,
        Array.isArray(item?.视觉标签) ? item.视觉标签.join(' ') : ''
    ].map((value) => 读取文本(value)).join(' ');
    return /坐骑|骏马|马匹|马\b|黑马|白马|赤兔|的卢|汗血|乌骓|青骢|黄骠|驴|骡|骆驼|牦牛/.test(text);
};

const 物品是否古代药物 = (item: any): boolean => {
    const text = [
        item?.名称,
        item?.类型,
        item?.描述,
        item?.视觉描述,
        Array.isArray(item?.视觉标签) ? item.视觉标签.join(' ') : ''
    ].map((value) => 读取文本(value)).join(' ');
    return /丹药|药丸|药散|散剂|药粉|药膏|膏药|药液|伤药|止血|凝血|金疮|解毒|疗伤|丸|散\b|膏\b/.test(text);
};

const 物品品质转英文 = (quality: string): string => {
    const map: Record<string, string> = {
        '传说': 'legendary', '绝世': 'mythic', '极品': 'top grade',
        '稀有': 'rare', '珍品': 'rare', '良品': 'fine', '精品': 'fine',
        '普通': 'common', '凡品': 'common', '杂物': 'cheap'
    };
    for (const [cn, en] of Object.entries(map)) {
        if (quality.includes(cn)) return en;
    }
    return 'common';
};

const 物品名称转英文描述 = (name: string): string => {
    // 常见武侠物品名称到英文视觉描述的映射
    const map: Record<string, string> = {
        '练功服': 'cloth kung fu training uniform, soft fabric robe and trousers, folded garment',
        '武服': 'cloth martial arts uniform, soft fabric outfit, folded garment',
        '劲装': 'fitted cloth martial arts outfit, soft fabric clothing',
        '布衣': 'plain cloth robe, soft fabric garment',
        '布衫': 'plain cloth shirt robe, soft fabric garment',
        '青衫': 'blue green cloth robe, soft fabric garment',
        '长衫': 'long cloth robe, soft fabric garment',
        '道袍': 'taoist cloth robe, soft flowing fabric garment',
        '外袍': 'outer cloth robe, soft flowing fabric garment',
        '长袍': 'long robe, soft fabric garment',
        '内衬': 'inner cloth lining garment, soft fabric clothing',
        '长裤': 'cloth trousers, folded fabric clothing',
        '布鞋': 'cloth shoes, woven fabric upper, layered stitched cloth sole, soft worn fabric footwear',
        '靴': 'boots, leather or cloth footwear',
        '木牌': 'wooden plaque tablet', '身份木牌': 'wooden identity plaque with carved text',
        '令牌': 'metal command token', '腰牌': 'waist badge token',
        '铜牌': 'bronze badge', '铁牌': 'iron plaque',
        '玉佩': 'jade pendant', '玉牌': 'jade plaque',
        '信物': 'keepsake token', '印章': 'seal stamp',
        '钥匙': 'ornate key', '锦囊': 'silk pouch',
        '卷轴': 'scroll', '书信': 'letter scroll',
        '地图': 'map scroll', '银票': 'silver banknote',
        '食盒': 'wooden food box', '酒壶': 'wine gourd',
        '灯笼': 'paper lantern', '火折子': 'fire starter flint',
        '绳索': 'hemp rope', '包袱': 'cloth bundle',
        '银两': 'silver ingots', '铜钱': 'copper coins',
        '凝血散': 'ancient hemostatic medicinal powder in a small folded paper packet or ceramic medicine vial, herbal powder for stopping bleeding',
        '金疮药': 'ancient wound medicine powder in a small ceramic medicine bottle or folded paper packet',
        '止血散': 'ancient hemostatic powder in a folded paper packet, herbal medicinal powder',
        '解毒散': 'ancient antidote powder in a folded paper packet or ceramic medicine vial',
        '骏马': 'real living horse, full body animal, natural coat and mane',
        '马匹': 'real living horse, full body animal, natural coat and mane',
        '黑马': 'real living black horse, full body animal, natural coat and mane',
        '白马': 'real living white horse, full body animal, natural coat and mane',
        '赤兔': 'real living chestnut red horse, full body animal, natural coat and mane',
        '的卢': 'real living horse, full body animal, natural coat and mane',
        '汗血': 'real living Akhal-Teke style horse, full body animal, natural coat and mane',
        '乌骓': 'real living dark horse, full body animal, natural coat and mane',
        '青骢': 'real living dapple gray horse, full body animal, natural coat and mane',
        '黄骠': 'real living dun horse, full body animal, natural coat and mane',
        '驴': 'real living donkey, full body animal, natural fur',
        '骡': 'real living mule, full body animal, natural fur',
        '骆驼': 'real living camel, full body animal, natural fur',
        '牦牛': 'real living yak, full body animal, natural fur',
    };
    for (const [cn, en] of Object.entries(map)) {
        if (name.includes(cn)) return en;
    }
    // 通用关键词推断
    if (/牌|令|符/.test(name)) return 'wooden or metal plaque token';
    if (/壶|瓶|罐/.test(name)) return 'ceramic or metal container vessel';
    if (/匣|盒|箱/.test(name)) return 'wooden box or case';
    if (/书|卷|册|经/.test(name)) return 'ancient book or scroll';
    if (/袋|囊|包/.test(name)) return 'cloth pouch or bag';
    if (/丹|药|散|丸|膏/.test(name)) return 'ancient medicinal item, herbal powder or pills stored in a folded paper packet, cloth sachet, or small ceramic medicine vial';
    if (物品名称是否柔性服装(name)) return 'soft cloth martial arts garment, folded fabric clothing';
    return '';
};

const 构建物品视觉主体描述 = (item: any): string => {
    const name = 读取文本(item?.名称);
    const isLivingMount = 物品是否坐骑生物(item);
    const isSoftGarment = 物品是否柔性服装(item);
    const isAncientMedicine = 物品是否古代药物(item);
    const typeEn = isLivingMount ? 'living mount animal' : isSoftGarment ? 'cloth garment' : isAncientMedicine ? 'ancient medicinal powder or pills' : 物品类型转英文(读取文本(item?.类型, '物品'));
    const qualityEn = 物品品质转英文(读取文本(item?.品质, '普通'));
    const nameEn = 物品名称转英文描述(name);
    const description = 读取文本(item?.视觉描述 || item?.描述);
    const tags = Array.isArray(item?.视觉标签)
        ? item.视觉标签.map((tag: unknown) => 读取文本(tag)).filter(Boolean).join(', ')
        : '';
    return [
        isLivingMount
            ? (nameEn ? `a single real living ${qualityEn} mount animal, ${nameEn}` : `a single real living ${qualityEn} ${typeEn}`)
            : (nameEn ? `a single ${qualityEn} ${nameEn}` : `a single ${qualityEn} ${typeEn} prop`),
        isLivingMount ? 'alive organic animal anatomy, natural fur coat, visible eyes, nostrils, mane or tail, standing on real ground, full body animal portrait' : '',
        isSoftGarment ? 'soft textile clothing item, fabric seams, cloth folds, woven texture, flexible silhouette' : '',
        isAncientMedicine ? 'ancient Chinese medicine presentation, herbal powder or pills, folded paper packet, cloth sachet, small ceramic medicine vial, apothecary prop, pre-modern wuxia era' : '',
        description ? `form and materials: ${description}` : '',
        tags ? `material cues: ${tags}` : ''
    ].filter(Boolean).join('\n');
};

export const 构建物品负面提示词 = (item: any): string => {
    const isSoftGarment = 物品是否柔性服装(item);
    const isClothShoe = 物品是否布鞋(item);
    const isLivingMount = 物品是否坐骑生物(item);
    const isAncientMedicine = 物品是否古代药物(item);
    return [
        isLivingMount ? 'rider, saddle covering the body, harness covering the body, cart, carriage, vehicle, boat' : 'person, human, face, hand',
        isLivingMount ? 'toy horse, plastic horse, resin figurine, statue, sculpture, ceramic, porcelain, model horse, miniature, collectible figurine, carousel horse, rocking horse, fake animal, mannequin, doll, glossy plastic, product prop, studio toy photography' : '',
        isLivingMount ? '' : 'toy, plastic figurine, resin model, statue, sculpture, mannequin',
        'text, typography, letters, words, numbers, caption, label, plaque, sign, inscription, Chinese characters, English letters, calligraphy, seal, stamp, logo, watermark, signature, title, poster text',
        'modern weapon, firearm, gun, rifle, pistol, shotgun, assault rifle, sniper rifle, machine gun, firearm stock, trigger guard, gun barrel, magazine, bullet, ammunition, grenade, rocket launcher, cannon, sci-fi weapon, futuristic weapon, tactical gear, modern military, plastic gun, mechanical firearm',
        'item card, game card, trading card, UI overlay, interface, badge, quality badge, rarity badge, speech bubble, dialogue box, border frame, decorative frame',
        'white background, cluttered background, ink wash, guofeng illustration, Chinese painting, brush strokes, anime, cartoon, flat illustration',
        isSoftGarment ? 'armor, cuirass, breastplate, metal armor, metal plates, gauntlet, shield, helmet, hard shell, leather jacket, shiny leather garment' : '',
        isAncientMedicine ? 'weapon, blade, sword, dagger, knife, armor plate, metal weapon, hardware tool, industrial object, modern container, syringe, capsule bottle, plastic medical bottle, laboratory vial' : '',
        isClothShoe ? 'leather dress shoe, polished leather shoe, oxford shoe, loafer, business shoe, high heel, glossy leather, hard stacked heel' : ''
    ].filter(Boolean).join(', ');
};

export const 构建物品图提示词 = (
    item: any,
    options?: { 画风?: string; 渲染风格?: string; 来源位置?: 物品生图来源位置 }
): string => {
    const style = options?.画风 || '写实';
    const renderStyle = options?.渲染风格 || '写实道具';
    const isLivingMount = 物品是否坐骑生物(item);
    const isSoftGarment = 物品是否柔性服装(item);
    const isAncientMedicine = 物品是否古代药物(item);
    const softGarmentGuard = isSoftGarment
        ? 'for clothing items: soft fabric garment laid flat or neatly folded, visible cloth weave, seams, wrinkles, flexible drape'
        : '';
    if (isLivingMount) {
        return [
            'photorealistic full-body portrait of one real living mount animal, alive animal, standing naturally on real ground, no rider',
            'natural animal anatomy, organic body, realistic fur coat, real eyes, nostrils, mane and tail, subtle muscle structure, natural posture',
            'outdoor natural light or neutral stable-yard light, clean background, clear silhouette, documentary animal photography',
            style === '写实' ? 'photorealistic' : style,
            构建物品视觉主体描述(item)
        ].filter(Boolean).join('\n');
    }
    // 精简 prompt：正向只描述目标画面，排除项交给独立负面提示词。
    return [
        renderStyle === '写实道具'
            ? 'photorealistic product photo of a single physical game prop, centered on a plain neutral background, realistic materials and soft shadow'
            : 'single game prop asset on a plain neutral background, centered composition, clean silhouette',
        获取渲染风格要求(renderStyle),
        style === '写实' ? 'photorealistic' : style,
        isAncientMedicine ? 'strict ancient wuxia medicine prop only: folded paper medicine packet, small cloth sachet, ceramic medicine vial, herbal powder or pills; absolutely pre-modern, no modern technology' : '',
        构建物品视觉主体描述(item),
        softGarmentGuard,
        'plain neutral background, centered object, clear silhouette, product catalog lighting'
    ].filter(Boolean).join('\n');
};

export const 生成物品图标 = async (
    item: 游戏物品,
    apiConfig: 接口设置结构,
    options?: 物品图标生成选项
): Promise<物品图标生成结果> => {
    const imageApi = 构建物品生图接口配置(options?.imageApi || 获取文生图接口配置(apiConfig));
    if (!接口配置是否可用(imageApi)) {
        throw new Error('请先在设置的“文生图”中配置可用接口，再生成物品图。');
    }

    const feature = apiConfig?.功能模型占位;
    const style = feature?.自动物品生图画风 || '写实';
    const renderStyle = feature?.自动物品生图渲染风格 || '写实道具';
    const size = 读取文本(options?.size || feature?.自动物品生图分辨率, '1024x1024') || '1024x1024';
    const sourceLocation = options?.sourceLocation || '背包';
    const enrichedItem: 游戏物品 = {
        ...(item as any),
        视觉描述: 读取文本((item as any)?.视觉描述) || 构建物品视觉描述(item),
    };
    const enrichedItemIsSoftGarment = 物品是否柔性服装(enrichedItem);
    const enrichedItemIsLivingMount = 物品是否坐骑生物(enrichedItem);
    const enrichedItemIsAncientMedicine = 物品是否古代药物(enrichedItem);
    const prompt = 构建物品图提示词(enrichedItem, {
        画风: style,
        渲染风格: renderStyle,
        来源位置: sourceLocation
    });
    const rawResult = await generateImageByPrompt(prompt, imageApi, options?.signal, {
        构图: '物品图标',
        尺寸: size,
        附加正向提示词: enrichedItemIsLivingMount
            ? 'real living animal, alive mount, full body animal portrait, natural fur, organic anatomy, standing on real ground, no toy, no statue'
            : enrichedItemIsAncientMedicine
            ? 'ancient Chinese medicine prop, folded paper medicine packet, ceramic medicine vial, herbal powder or pills, pre-modern wuxia era, single physical object, photorealistic product photo, neutral matte studio background'
            : renderStyle === '写实道具'
            ? `single physical object, photorealistic product photo, centered product composition, neutral matte studio background, clean silhouette, realistic material${enrichedItemIsSoftGarment ? ', soft fabric garment, cloth folds, flexible drape' : ''}`
            : 'single physical object, centered composition, clean silhouette, plain asset presentation',
        附加负面提示词: 构建物品负面提示词(enrichedItem),
    });
    const localResult = await persistImageAssetLocally(rawResult);
    const imageRecord: 物品生图结果 = {
        id: options?.recordId || `item_img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        图片URL: localResult.图片URL,
        本地路径: localResult.本地路径,
        生图词组: prompt,
        最终正向提示词: localResult.最终正向提示词,
        最终负向提示词: localResult.最终负向提示词,
        原始描述: JSON.stringify(enrichedItem, null, 2),
        使用模型: imageApi.model || imageApi.图片后端类型 || 'image-model',
        生成时间: Date.now(),
        构图: '物品图标',
        画风: style as 物品生图结果['画风'],
        渲染风格: renderStyle as 物品生图结果['渲染风格'],
        尺寸: size,
        状态: 'success',
        来源: 'generated',
    };
    const nextItem: 游戏物品 = {
        ...(enrichedItem as any),
        视觉描述来源: (enrichedItem as any).视觉描述来源 || '规则生成',
        图片档案: 合并物品图片档案(enrichedItem, imageRecord),
    };

    return { nextItem, imageRecord, prompt, imageApi };
};
