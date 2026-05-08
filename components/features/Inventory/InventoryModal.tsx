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
const CATEGORY_COLORS: Record<ItemCategory, string> = {
    全部: 'text-wuxia-gold',
    装备: 'text-amber-400',
    消耗品: 'text-emerald-400',
    材料: 'text-cyan-400',
    秘籍: 'text-purple-400',
    杂物: 'text-stone-400',
};
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
    const icons: Record<string, React.ReactElement> = {
        全部: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
            </svg>
        ),
        装备: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12c4.16-1.26 8-6.45 8-12V6l-8-4z" />
            </svg>
        ),
        武器: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.5 2C7.5 2 9 4 12 4C15 4 16.5 2 16.5 2L17 2.5C17 2.5 16 4.5 16 6C16 7.5 17.5 9 19 9.5L20 10L19.5 11C19.5 11 17 10.5 15 11.5C13 12.5 12 15 12 15C12 15 11 12.5 9 11.5C7 10.5 4.5 11 4.5 11L4 10L5 9.5C6.5 9 8 7.5 8 6C8 4.5 7 2.5 7 2.5L7.5 2Z" />
                <path d="M12 15V22M9 19H15" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
        ),
        防具: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 6V11C4 16 7 20.5 12 22C17 20.5 20 16 20 11V6L12 2ZM12 4.5L17.5 7.5V11C17.5 14.5 15.5 17.5 12 19C8.5 17.5 6.5 14.5 6.5 11V7.5L12 4.5Z" />
            </svg>
        ),
        饰品: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C9 2 6.5 4 6 7C5.5 10 7.5 13 10 14.5V17C10 18.5 8.5 20 7 20.5V22H17V20.5C15.5 20 14 18.5 14 17V14.5C16.5 13 18.5 10 18 7C17.5 4 15 2 12 2ZM12 4C13.5 4 14.5 4.5 15 6H9C9.5 4.5 10.5 4 12 4ZM12 13C10 13 8.5 11.5 8 9.5H16C15.5 11.5 14 13 12 13Z" />
            </svg>
        ),
        消耗品: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 2H15V4H17C18.5 4 19.5 5 19.5 6.5V19.5C19.5 21 18.5 22 17 22H7C5.5 22 4.5 21 4.5 19.5V6.5C4.5 5 5.5 4 7 4H9V2ZM12 18C13.5 18 14.5 17 14.5 15.5C14.5 14 13.5 13 12 13C10.5 13 9.5 14 9.5 15.5C9.5 17 10.5 18 12 18ZM8 6H16V10H8V6Z" />
            </svg>
        ),
        秘籍: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4H20V20H4V4ZM6 6V18H18V6H6ZM8 8H16V10H8V8ZM8 12H14V14H8V12Z" />
                <path d="M12 2L13 4H11L12 2Z" fill="currentColor" />
            </svg>
        ),
        材料: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14 8H20L15 12L17 18L12 14L7 18L9 12L4 8H10L12 2Z" />
            </svg>
        ),
        杂物: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 6H19V8H5V6ZM5 10H15V12H5V10ZM5 14H17V16H5V14ZM5 18H13V20H5V18Z" />
                <circle cx="18" cy="17" r="3" fill="currentColor" />
            </svg>
        ),
        杂项: (
            <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM12 20C7.5 20 4 16.5 4 12C4 7.5 7.5 4 12 4C16.5 4 20 7.5 20 12C20 16.5 16.5 20 12 20ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z" />
            </svg>
        ),
    };

    return icons[type] || icons.杂物;
};

const InventoryModal: React.FC<Props> = ({ character, onClose, onCharacterChange }) => {
    const [activeCategory, setActiveCategory] = useState<ItemCategory>('全部');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [actionMessage, setActionMessage] = useState('');

    const items = Array.isArray(character?.物品列表) ? character.物品列表 : [];
    const totalWeight = getSafeNumber(character?.当前负重);
    const maxWeight = getSafeNumber(character?.最大负重, 50);
    const weightPercent = maxWeight > 0 ? Math.min((totalWeight / maxWeight) * 100, 100) : 0;
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

    const totalValue = items.reduce((sum, item) => (
        sum + getSafeNumber(item?.价值) * getSafeNumber(item?.堆叠数量, 1)
    ), 0);
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

    const handleEquipBest = () => {
        if (!onCharacterChange) return;
        const nextCharacter = 自动装备最佳装备(character);
        applyCharacterChange(nextCharacter, getSafeText(selectedItem?.ID) || getSafeText(selectedItem?.名称));
        setActionMessage('已自动换上当前最优装备');
    };

    return (
        <div className="fixed inset-0 z-[200] hidden items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fadeIn md:flex">
            <div className="relative flex h-[90vh] max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-wuxia-gold/20 bg-ink-black/95 shadow-[0_0_80px_rgba(0,0,0,0.9)] shadow-wuxia-gold/10">
                <div className="relative z-50 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-gradient-to-r from-black/80 to-black/40 px-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-wuxia-gold shadow-[0_0_10px_rgba(212,175,55,0.8)] animate-pulse" />
                        <h3 className="font-serif text-xl font-bold tracking-[0.4em] text-wuxia-gold drop-shadow-md">
                            仙途行囊
                            <span className="ml-2 rounded-full border border-wuxia-gold/20 px-2 py-0.5 font-mono text-[10px] tracking-widest text-wuxia-gold/50">
                                INVENTORY
                            </span>
                        </h3>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 rounded border border-wuxia-gold/20 bg-black/40 px-4 py-1.5 shadow-inner">
                            <span className="text-[10px] uppercase tracking-widest text-wuxia-gold/70">负重</span>
                            <div className="h-1.5 w-32 overflow-hidden rounded-full border border-white/5 bg-gray-900">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        isOverloaded
                                            ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]'
                                            : weightPercent > 80
                                                ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]'
                                                : 'bg-wuxia-gold shadow-[0_0_5px_rgba(212,175,55,0.8)]'
                                    }`}
                                    style={{ width: `${weightPercent}%` }}
                                />
                            </div>
                            <span className={`text-[10px] font-mono ${isOverloaded ? 'text-red-400' : 'text-gray-300'}`}>
                                {totalWeight.toFixed(1)} / {maxWeight}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-black/50 text-gray-400 transition-all hover:rotate-90 hover:border-red-400 hover:bg-red-400/10 hover:text-red-400"
                            title="关闭"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="relative flex flex-1 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-ink-wash/5 bg-cover bg-center opacity-30 mix-blend-luminosity blur-sm" />
                        <div className="absolute inset-0 bg-gradient-to-br from-wuxia-gold/5 via-transparent to-black" />
                    </div>

                    <div className="relative z-10 flex w-56 shrink-0 flex-col gap-2 overflow-y-auto border-r border-wuxia-gold/10 bg-black/40 p-4 backdrop-blur-sm custom-scrollbar">
                        <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-wuxia-gold/50">
                            <span className="h-3 w-1 rounded-full bg-wuxia-gold/50" />
                            行囊格位
                        </div>

                        {CATEGORIES.map((category) => (
                            <button
                                key={category}
                                type="button"
                                onClick={() => {
                                    setActiveCategory(category);
                                    setSelectedItem(null);
                                }}
                                className={`group relative flex items-center justify-between overflow-hidden rounded-xl px-3 py-3 transition-all ${
                                    activeCategory === category
                                        ? 'border border-wuxia-gold/40 bg-gradient-to-r from-wuxia-gold/20 to-wuxia-gold/5 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                                        : 'border border-transparent hover:border-white/10 hover:bg-white/[0.03]'
                                }`}
                            >
                                {activeCategory === category ? (
                                    <div className="absolute inset-y-0 left-0 z-10 w-1 bg-wuxia-gold shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                                ) : null}
                                <span className={`flex items-center gap-3 font-serif ${
                                    activeCategory === category ? 'font-bold text-wuxia-gold drop-shadow-sm' : 'text-gray-300 group-hover:text-gray-200'
                                }`}>
                                    <span className={`flex h-5 w-5 items-center justify-center ${
                                        activeCategory === category ? 'text-wuxia-gold' : CATEGORY_COLORS[category]
                                    } opacity-80 group-hover:opacity-100`}>
                                        {renderItemIcon(category, 'h-4 w-4')}
                                    </span>
                                    <span>{category}</span>
                                </span>
                                <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                                    activeCategory === category
                                        ? 'border-wuxia-gold/30 bg-wuxia-gold/20 text-wuxia-gold'
                                        : 'border-gray-800 bg-black/60 text-gray-500'
                                }`}>
                                    {getCategoryCount(items, category)}
                                </span>
                            </button>
                        ))}

                        <div className="mt-auto space-y-3 border-t border-wuxia-gold/10 pt-6">
                            <button
                                type="button"
                                onClick={handleEquipBest}
                                disabled={!onCharacterChange}
                                className="w-full rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                自动穿戴最佳
                            </button>
                            <div className="rounded-lg border border-wuxia-gold/5 bg-black/40 p-3">
                                <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-gray-500">Total Value</div>
                                <div className="flex items-center gap-1.5 font-serif text-sm text-wuxia-gold">
                                    <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm-1-8H9v-2h2V8h2v2h2v2h-2v2h-2v-2z" />
                                    </svg>
                                    {totalValue.toLocaleString()} 铜
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex-1 overflow-y-auto p-6 custom-scrollbar">
                        {displayItems.length > 0 ? (
                            <div className="grid grid-cols-5 gap-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9">
                                {displayItems.map((item, index) => {
                                    const count = getSafeNumber(item?.堆叠数量, 1);
                                    const styles = getRarityStyles(getSafeText(item?.品质));
                                    const name = getSafeText(item?.名称, '未命名物品');
                                    const isEquipped = Boolean(item?.当前装备部位);
                                    const isSelected = selectedItem?.ID === item?.ID;
                                    const key = String(item?.ID ?? `${name}-${index}`);

                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSelectedItem(item)}
                                            className={`group relative aspect-square cursor-pointer rounded-xl text-left transition-all active:scale-95 ${
                                                isSelected
                                                    ? 'scale-[1.02] ring-2 ring-wuxia-gold/60 shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                                                    : 'hover:scale-[1.02]'
                                            }`}
                                        >
                                            <div className="absolute inset-0 rounded-xl border border-white/5 bg-gradient-to-br from-black/80 to-black opacity-80 transition-opacity group-hover:opacity-100" />
                                            <div className={`absolute inset-0 rounded-xl border ${styles.border} ${styles.bg} ${
                                                isSelected ? 'border-opacity-80 bg-opacity-30' : 'border-opacity-30 bg-opacity-10'
                                            } shadow-inner transition-all group-hover:border-opacity-50 group-hover:bg-opacity-20`} />

                                            {isEquipped ? (
                                                <div className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                                                    <span className="text-[9px] font-bold text-white drop-shadow-md">装</span>
                                                </div>
                                            ) : null}

                                            <div className="absolute inset-0 flex items-center justify-center pb-4 transition-transform duration-300 group-hover:-translate-y-1">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-black/40 shadow-inner ${styles.text}`}>
                                                    {renderItemIcon(getSafeText(item?.类型), 'h-6 w-6 opacity-90 drop-shadow-md group-hover:opacity-100')}
                                                </div>
                                            </div>

                                            <div className="absolute bottom-1.5 left-0 right-0 px-1 text-center">
                                                <div className={`truncate text-[10px] font-medium tracking-wide drop-shadow-sm ${getRarityNameClass(getSafeText(item?.品质))}`}>
                                                    {name}
                                                </div>
                                                {count > 1 ? (
                                                    <div className="mt-0.5 font-mono text-[10px] text-gray-400">x{count}</div>
                                                ) : null}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500 opacity-30">
                                <span className="text-4xl">空</span>
                                <span className="text-xl tracking-widest">空空如也</span>
                            </div>
                        )}
                    </div>

                    {selectedItem ? (
                        <div className="absolute inset-y-0 right-0 z-20 flex w-[400px] flex-col border-l border-wuxia-gold/20 bg-gradient-to-b from-black/95 to-[#0c0d0f]/95 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md animate-slideInRight">
                            <div className="relative overflow-hidden border-b border-wuxia-gold/10 bg-black/60 p-5">
                                <div className={`absolute right-0 top-0 h-32 w-32 rounded-full opacity-20 blur-3xl ${getRarityStyles(getSafeText(selectedItem?.品质)).bg}`} />
                                <div className="relative z-10 flex gap-4">
                                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border bg-opacity-20 shadow-lg ${
                                        getRarityStyles(getSafeText(selectedItem?.品质)).border
                                    } ${getRarityStyles(getSafeText(selectedItem?.品质)).bg}`}>
                                        {renderItemIcon(getSafeText(selectedItem?.类型), `h-8 w-8 drop-shadow-md ${getRarityStyles(getSafeText(selectedItem?.品质)).text}`)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={`truncate text-xl ${getRarityNameClass(getSafeText(selectedItem?.品质))}`}>
                                            {getSafeText(selectedItem?.名称, '未命名物品')}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-gray-300">
                                                {getSafeText(selectedItem?.类型, '未知')}
                                            </span>
                                            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-gray-300">
                                                {getSafeText(selectedItem?.品质, '未知')}
                                            </span>
                                            {selectedItem?.当前装备部位 ? (
                                                <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-blue-300">
                                                    已装备：{selectedItem.当前装备部位}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="absolute right-4 top-4 rounded-full border border-gray-800 bg-black/40 p-1.5 text-gray-500 transition-all hover:rotate-90 hover:text-white"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm text-gray-300 custom-scrollbar">
                                <div className="rounded-xl border border-white/5 bg-black/25 p-4 leading-relaxed text-gray-200/85">
                                    {getSafeText(selectedItem?.描述, '暂无描述')}
                                </div>

                                {selectedCanEquip ? (
                                    <div className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <span className="text-xs font-semibold tracking-[0.16em] text-amber-200">装备操作</span>
                                            <span className="truncate text-[10px] text-gray-500">
                                                {selectedItem?.当前装备部位 ? `当前：${selectedItem.当前装备部位}` : `可装备：${selectedEquipSlots.map(获取装备槽位标签).join(' / ')}`}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={handleEquipSelected}
                                                disabled={!onCharacterChange}
                                                className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                装备
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleUnequipSelected}
                                                disabled={!onCharacterChange || !selectedItem?.当前装备部位}
                                                className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                卸下
                                            </button>
                                        </div>
                                        {actionMessage ? (
                                            <div className="mt-2 truncate text-[10px] text-amber-200/80">{actionMessage}</div>
                                        ) : null}
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-black/25 p-4">
                                    <div className="flex justify-between"><span className="text-gray-500">类型</span><span>{getSafeText(selectedItem?.类型, '未知')}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">品质</span><span>{getSafeText(selectedItem?.品质, '未知')}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">单件重量</span><span className="font-mono">{getSafeNumber(selectedItem?.重量)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">持有数量</span><span className="font-mono">{getSafeNumber(selectedItem?.堆叠数量, 1)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">总价值</span><span className="font-mono text-amber-400">{getSafeNumber(selectedItem?.价值) * getSafeNumber(selectedItem?.堆叠数量, 1)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">耐久度</span><span className="font-mono">{getSafeNumber(selectedItem?.当前耐久)}/{getSafeNumber(selectedItem?.最大耐久)}</span></div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default InventoryModal;
