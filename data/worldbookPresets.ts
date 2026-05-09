import type { 世界书结构 } from '../types';
import { 解析世界书导入数据 } from '../utils/worldbook';

export type BundledWorldbookPreset = {
    id: string;
    title: string;
    description: string;
    path: string;
};

export const bundledWorldbookPresets: BundledWorldbookPreset[] = [
    {
        id: 'mingqi-core',
        title: '名器世界书',
        description: '主体规则、索引和通用名器条目。',
        path: '/worldbook-presets/mingqi-core.json'
    },
    {
        id: 'mingqi-buttock',
        title: '臀部名器世界书',
        description: '臀部、臀缝和相关联动扩展。',
        path: '/worldbook-presets/mingqi-buttock.json'
    },
    {
        id: 'mingqi-anal',
        title: '后穴名器世界书',
        description: '后穴向规则与专用扩展。',
        path: '/worldbook-presets/mingqi-anal.json'
    }
];

export const bundledDefaultWorldbookIds = [
    'worldbook_yin_yang_record',
    'worldbook_yin_yang_record_buttock',
    'worldbook_yin_yang_record_anal'
];

export const loadBundledWorldbookPreset = async (preset: BundledWorldbookPreset): Promise<世界书结构[]> => {
    const response = await fetch(preset.path, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`${preset.title} 读取失败（HTTP ${response.status}）。`);
    }
    return 解析世界书导入数据(await response.json());
};

export const loadAllBundledWorldbookPresets = async (): Promise<世界书结构[]> => {
    const payloads = await Promise.all(bundledWorldbookPresets.map((preset) => loadBundledWorldbookPreset(preset)));
    return payloads.flat();
};
