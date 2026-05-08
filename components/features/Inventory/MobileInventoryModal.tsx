import React, { useMemo, useState } from 'react';
import { getRarityNameClass, getRarityStyles } from '../../ui/rarityStyles';
import {
    自动装备最佳装备,
    装备物品到角色,
    卸下角色装备,
    是否可装备物品,
    获取物品可装备槽位,
    获取装备槽位标签
} from '../../../utils/equipmentActions';

interface Props {
    character: any;
    onClose: () => void;
    onCharacterChange?: (nextCharacter: any) => void;
}

type ItemCategory = '全部' | '装备' | '消耗品' | '材料' | '秘籍' | '杂物';

const TYPE_ORDER = ['武器', '防具', '饰品', '秘籍', '消耗品', '材料', '杂物', '杂项'];
const QUALITY_ORDER = ['传说', '绝世', '极品', '上品', '良品', '凡品'];
const CATEGORIES: ItemCategory[] = ['全部', '装备', '消耗品', '材料', '秘籍', '杂物'];

const getSafeNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getSafeText = (value: unknown, fallback = '') => (
    typeof value === 'string' ? value.trim() : fallback
);

const getCategoryCount = (items: any[], category: ItemCategory) => {
    if (category === '全部') return items.length;
    if (category === '装备') return items.filter((item) => ['武器', '防具', '饰品'].includes(getSafeText(item?.类型))).length;
    if (category === '杂物') return items.filter((item) => ['杂物', '杂项'].includes(getSafeText(item?.类型))).length;
    return items.filter((item) => getSafeText(item?.类型) === category).length;
};

const renderItemIcon = (type: string, className: string) => {
    const props = { className, fill: 'currentColor', viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' };
    switch (type) {
        case '武器':
            return <svg {...props}><path d="M12 1L9 9h2v7H7v2h4v4h2v-4h4v-2h-4V9h2L12 1z" /></svg>;
        case '防具':
            return <svg {...props}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>;
        case '饰品':
            return <svg {...props}><path d="M12 2C7.03 2 3 6.03 3 11c0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm0-12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" /></svg>;
        case '消耗品':
            return <svg {...props}><path d="M15 6v2H9V6h6zm-2-2V2h-2v2h-2v2h6V4h-2zM9 10v8c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-8H9zm2 8v-6h2v6h-2z" /></svg>;
        case '秘籍':
            return <svg {...props}><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4.18c.42 1.16 1.54 2 2.82 2s2.4-.84 2.82-2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 15.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm0-4c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>;
        case '材料':
            return <svg {...props}><path d="M12 2C7.5 2 4 6.5 4 12s3.5 10 8 10 8-4.5 8-10-3.5-10-8-10zm0 18c-3.5 0-6-3.5-6-8s2.5-8 6-8 6 3.5 6 8-2.5 8-6 8zM12 6c-1.5 0-3 1.5-3 3s1.5 3 3 3 3-1.5 3-3-1.5-3-3-3z" /></svg>;
        default:
            return <svg {...props}><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" /></svg>;
    }
};

const MobileInventoryModal: React.FC<Props> = ({ character, onClose, onCharacterChange }) => {
    const [activeCategory, setActiveCategory] = useState<ItemCategory>('全部');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [actionMessage, setActionMessage] = useState('');

    const items = Array.isArray(character?.物品列表) ? character.物品列表 : [];
    const totalWeight = getSafeNumber(character?.当前负重);
    const maxWeight = getSafeNumber(character?.最大负重, 50);
    const isOverloaded = totalWeight > maxWeight;

    const displayItems = useMemo(() => {
        const filtered = items.filter((item) => {
            const type = getSafeText(item?.类型);
            if (activeCategory === '全部') return true;
            if (activeCategory === '装备') return ['武器', '防具', '饰品'].includes(type);
            if (activeCategory === '杂物') return ['杂物', '杂项'].includes(type);
            return type === activeCategory;
        });

        return [...filtered].sort((a, b) => {
            const leftType = TYPE_ORDER.indexOf(getSafeText(a?.类型));
            const rightType = TYPE_ORDER.indexOf(getSafeText(b?.类型));
            if (leftType !== rightType) return Math.max(leftType, 0) - Math.max(rightType, 0);

            const leftQuality = QUALITY_ORDER.indexOf(getSafeText(a?.品质));
            const rightQuality = QUALITY_ORDER.indexOf(getSafeText(b?.品质));
            if (leftQuality !== rightQuality) return Math.max(leftQuality, 0) - Math.max(rightQuality, 0);

            return getSafeText(a?.名称).localeCompare(getSafeText(b?.名称), 'zh-Hans-CN');
        });
    }, [activeCategory, items]);
    const selectedEquipSlots = selectedItem ? 获取物品可装备槽位(selectedItem) : [];
    const selectedCanEquip = selectedItem ? 是否可装备物品(selectedItem) : false;

    const applyCharacterChange = (nextCharacter: any, selectedItemRef?: string) => {
        onCharacterChange?.(nextCharacter);
        if (selectedItemRef) {
            const nextItem = Array.isArray(nextCharacter?.物品列表)
                ? nextCharacter.物品列表.find((item: any) => item?.ID === selectedItemRef || item?.名称 === selectedItemRef)
                : null;
            if (nextItem) setSelectedItem(nextItem);
        }
    };

    const handleEquipBest = () => {
        if (!onCharacterChange) return;
        const nextCharacter = 自动装备最佳装备(character);
        applyCharacterChange(nextCharacter, getSafeText(selectedItem?.ID) || getSafeText(selectedItem?.名称));
        setActionMessage('已自动换上当前最优装备');
    };

    const handleEquipSelected = () => {
        if (!selectedItem || !onCharacterChange) return;
        const itemRef = getSafeText(selectedItem?.ID) || getSafeText(selectedItem?.名称);
        const nextCharacter = 装备物品到角色(character, itemRef, selectedEquipSlots[0]);
        applyCharacterChange(nextCharacter, itemRef);
        setActionMessage(`已装备到${获取装备槽位标签(selectedEquipSlots[0])}`);
    };

    const handleUnequipSelected = () => {
        if (!selectedItem || !onCharacterChange) return;
        const itemRef = getSafeText(selectedItem?.ID) || getSafeText(selectedItem?.名称);
        const nextCharacter = 卸下角色装备(character, itemRef);
        applyCharacterChange(nextCharacter, itemRef);
        setActionMessage('已卸下装备');
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
            <div className="relative flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
                <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-800 bg-black/40 px-4">
                    <span className="font-bold tracking-wider text-gray-200">行囊</span>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-mono ${isOverloaded ? 'text-red-500' : 'text-gray-500'}`}>
                            {totalWeight}/{maxWeight}斤
                        </span>
                        <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-white" aria-label="关闭">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-gray-800 bg-black/20 px-3 py-2 no-scrollbar">
                    <button
                        type="button"
                        onClick={handleEquipBest}
                        disabled={!onCharacterChange}
                        className="shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-100 disabled:opacity-40"
                    >
                        最佳
                    </button>
                    {CATEGORIES.map((category) => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => {
                                setActiveCategory(category);
                                setSelectedItem(null);
                            }}
                            className={`shrink-0 rounded-md border px-3 py-1 text-xs font-bold transition-all ${
                                activeCategory === category
                                    ? 'border-gray-600 bg-gray-800 text-gray-200'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {category} {getCategoryCount(items, category)}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto bg-black/10 p-2 space-y-2">
                    {displayItems.length > 0 ? displayItems.map((item, index) => {
                        const count = getSafeNumber(item?.堆叠数量, 1);
                        const styles = getRarityStyles(getSafeText(item?.品质));
                        const name = getSafeText(item?.名称, '未命名物品');
                        const isEquipped = Boolean(item?.当前装备部位);
                        const key = String(item?.ID ?? `${name}-${index}`);

                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedItem(item)}
                                className={`relative flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-all active:scale-95 ${styles.border} ${styles.bg}`}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-800 bg-black/60">
                                    {renderItemIcon(getSafeText(item?.类型), `w-6 h-6 opacity-80 ${styles.text}`)}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className={`truncate text-xs ${getRarityNameClass(getSafeText(item?.品质))}`}>{name}</div>
                                        {count > 1 ? (
                                            <span className="rounded bg-black/40 px-1 text-[10px] font-mono text-gray-400">x{count}</span>
                                        ) : null}
                                    </div>
                                    <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                                        <span className="flex gap-2">
                                            <span className={`${styles.text} ${styles.glow}`}>{getSafeText(item?.品质, '未知')}</span>
                                            {isEquipped ? <span className="text-blue-500">已装备</span> : null}
                                        </span>
                                        <span className="font-mono">{getSafeNumber(item?.重量)}斤</span>
                                    </div>
                                </div>
                            </button>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-500 opacity-40">
                            <span className="text-3xl">空</span>
                            <span className="text-xs">当前分类下没有物品</span>
                        </div>
                    )}
                </div>

                {selectedItem ? (
                    <div className="absolute inset-0 z-10 flex flex-col bg-gray-900/95 animate-slideInRight">
                        <div className="flex h-10 shrink-0 items-center justify-between border-b border-gray-800 bg-black/20 px-4">
                            <div className="min-w-0 truncate text-sm text-gray-100">
                                <span className={getRarityNameClass(getSafeText(selectedItem?.品质))}>
                                    {getSafeText(selectedItem?.名称, '未命名物品')}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedItem(null)}
                                className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300"
                            >
                                返回
                            </button>
                        </div>

                        <div className="flex-1 space-y-4 overflow-y-auto bg-black/10 p-4 text-xs text-gray-300">
                            <p className="rounded bg-black/20 p-2 leading-relaxed opacity-80">
                                {getSafeText(selectedItem?.描述, '暂无描述')}
                            </p>

                            <div className="grid grid-cols-2 gap-2 rounded border border-gray-800/50 bg-black/20 p-2">
                                <div className="flex justify-between"><span className="text-gray-500">类型</span><span>{getSafeText(selectedItem?.类型, '未知')}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">品质</span><span>{getSafeText(selectedItem?.品质, '未知')}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">单件重量</span><span className="font-mono">{getSafeNumber(selectedItem?.重量)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">持有数量</span><span className="font-mono">{getSafeNumber(selectedItem?.堆叠数量, 1)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">总价值</span><span className="font-mono text-amber-400">{getSafeNumber(selectedItem?.价值) * getSafeNumber(selectedItem?.堆叠数量, 1)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">耐久度</span><span className="font-mono">{getSafeNumber(selectedItem?.当前耐久)}/{getSafeNumber(selectedItem?.最大耐久)}</span></div>
                            </div>

                            {selectedCanEquip ? (
                                <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold text-amber-200">装备操作</span>
                                        <span className="truncate text-[10px] text-gray-500">
                                            {selectedItem?.当前装备部位 ? `当前：${selectedItem.当前装备部位}` : selectedEquipSlots.map(获取装备槽位标签).join(' / ')}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={handleEquipSelected}
                                            disabled={!onCharacterChange}
                                            className="rounded bg-emerald-700/40 px-3 py-2 text-xs font-bold text-emerald-100 disabled:opacity-40"
                                        >
                                            装备
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleUnequipSelected}
                                            disabled={!onCharacterChange || !selectedItem?.当前装备部位}
                                            className="rounded bg-sky-700/40 px-3 py-2 text-xs font-bold text-sky-100 disabled:opacity-40"
                                        >
                                            卸下
                                        </button>
                                    </div>
                                    {actionMessage ? (
                                        <div className="mt-2 truncate text-[10px] text-amber-200/80">{actionMessage}</div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default MobileInventoryModal;
