import React from 'react';
import {
    保存拍卖行状态,
    上架背包物品,
    拍卖品记录,
    拍卖行状态,
    格式化拍卖货币,
    格式化金钱折算,
    格式化铜钱总值,
    计算金钱铜钱总值,
    计算物品市场铜钱,
    清理并补货,
    生成行情列表,
    创建交易记录,
    购买拍卖品,
} from '../../../services/auctionHouse';
import { getRarityNameClass, getRarityStyles } from '../../ui/rarityStyles';
import type { 接口设置结构 } from '../../../types';
import { 生成物品图标 } from '../../../services/ai/itemImageGeneration';
import { 获取物品已选图标地址 } from '../../../utils/itemImage';

interface Props {
    character: any;
    auctionState: 拍卖行状态;
    onAuctionStateChange: (state: 拍卖行状态) => void;
    onCharacterChange: (nextCharacter: any) => void;
    onNotify?: (title: string, message: string, tone?: 'info' | 'success' | 'error') => void;
    onClose: () => void;
    isMobile?: boolean;
    storageScope?: string;
    apiConfig?: 接口设置结构;
}

type 分类 = '全部' | '装备' | '武器' | '防具' | '饰品' | '消耗品' | '材料' | '秘籍' | '杂物';
type 排序 = '最新上架' | '价格升序' | '价格降序' | '品质优先' | '热点优先';

const 分类列表: 分类[] = ['全部', '装备', '武器', '防具', '饰品', '消耗品', '材料', '秘籍', '杂物'];
const 品质权重: Record<string, number> = { 传说: 6, 绝世: 5, 极品: 4, 上品: 3, 良品: 2, 凡品: 1 };
const 读数 = (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const 取背包物品 = (character: any) => (
    Array.isArray(character?.物品列表) ? character.物品列表 : []
).filter((item: any) => item && !item.当前装备部位);
const 是装备类 = (type: unknown) => type === '武器' || type === '防具' || type === '饰品';
const 格式化时间 = (value?: number) => {
    if (!value) return '未知';
    return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const AuctionHouseModal: React.FC<Props> = ({
    character,
    auctionState,
    onAuctionStateChange,
    onCharacterChange,
    onNotify,
    onClose,
    isMobile = false,
    storageScope,
    apiConfig,
}) => {
    const [activeCategory, setActiveCategory] = React.useState<分类>('全部');
    const [sortBy, setSortBy] = React.useState<排序>('热点优先');
    const [selectedAuctionId, setSelectedAuctionId] = React.useState<string>('');
    const [sellItemId, setSellItemId] = React.useState<string>('');
    const [minPrice, setMinPrice] = React.useState('');
    const [maxPrice, setMaxPrice] = React.useState('');
    const [hotOnly, setHotOnly] = React.useState(false);
    const [generatingItemId, setGeneratingItemId] = React.useState('');

    const bagItems = React.useMemo(() => 取背包物品(character), [character]);
    const money = character?.金钱 || {};
    const totalCopper = 计算金钱铜钱总值(money);
    const playerId = character?.姓名 || 'player';
    const activeAuctions = React.useMemo(
        () => (auctionState.拍卖品列表 || []).filter((entry) => entry.状态 === '上架中'),
        [auctionState.拍卖品列表]
    );

    const displayAuctions = React.useMemo(() => {
        const low = minPrice ? Number(minPrice) : undefined;
        const high = maxPrice ? Number(maxPrice) : undefined;
        const filtered = activeAuctions.filter((entry) => {
            const type = entry.物品?.类型;
            const price = 读数(entry.一口价 || entry.当前价格);
            if (activeCategory === '装备' && !是装备类(type)) return false;
            if (activeCategory !== '全部' && activeCategory !== '装备' && type !== activeCategory) return false;
            if (hotOnly && !entry.是否限时热点 && !(entry.市场标签 || []).includes('限时热拍')) return false;
            if (Number.isFinite(low) && price < Number(low)) return false;
            if (Number.isFinite(high) && price > Number(high)) return false;
            return true;
        });
        return [...filtered].sort((a, b) => {
            if (sortBy === '价格升序') return 读数(a.一口价) - 读数(b.一口价);
            if (sortBy === '价格降序') return 读数(b.一口价) - 读数(a.一口价);
            if (sortBy === '品质优先') return (品质权重[b.物品?.品质] || 0) - (品质权重[a.物品?.品质] || 0);
            if (sortBy === '热点优先') return Number(Boolean(b.是否限时热点)) - Number(Boolean(a.是否限时热点)) || 读数(b.上架时间) - 读数(a.上架时间);
            return 读数(b.上架时间) - 读数(a.上架时间);
        });
    }, [activeAuctions, activeCategory, hotOnly, maxPrice, minPrice, sortBy]);

    const selectedAuction = React.useMemo(
        () => displayAuctions.find((entry) => entry.ID === selectedAuctionId) || displayAuctions[0] || null,
        [displayAuctions, selectedAuctionId]
    );

    React.useEffect(() => {
        if (selectedAuction && selectedAuction.ID !== selectedAuctionId) {
            setSelectedAuctionId(selectedAuction.ID);
        }
    }, [selectedAuction, selectedAuctionId]);

    const updateAuctionState = (next: 拍卖行状态) => {
        onAuctionStateChange(next);
        保存拍卖行状态(next, storageScope);
    };

    const notify = (title: string, message: string, tone: 'info' | 'success' | 'error' = 'info') => {
        onNotify?.(title, message, tone);
    };

    const appendRecord = (state: 拍卖行状态, record: 拍卖行状态['交易记录'][number]) => ({
        ...state,
        交易记录: [record, ...(state.交易记录 || [])].slice(0, 40),
    });

    const handleRefresh = () => {
        const market = 生成行情列表(true, auctionState.行情列表 || [], auctionState.最近行情时间);
        const next = 清理并补货({
            ...auctionState,
            行情列表: market.行情列表,
            最近行情时间: market.最近行情时间,
            最近补货时间: 0,
        });
        updateAuctionState(next);
        notify('市场已刷新', '牙行撤换旧货，并重新挂出受行情影响的新货。', 'success');
    };

    const handleBuy = (auction: 拍卖品记录 | null = selectedAuction) => {
        if (!auction) return;
        if (auction.卖家ID === playerId) {
            notify('无法购买', '这是你自己寄售的货品，可以撤回或交给牙行收购。', 'info');
            return;
        }
        const result = 购买拍卖品(character, auction);
        if (!result.ok) {
            notify('购买失败', result.message, 'error');
            return;
        }
        const baseState = {
            ...auctionState,
            拍卖品列表: auctionState.拍卖品列表.map((entry) => entry.ID === auction.ID ? result.nextAuction : entry),
        };
        updateAuctionState(appendRecord(baseState, result.nextAuction));
        onCharacterChange(result.nextCharacter);
        console.info('[拍卖行交易] 购买完成', auction.物品?.名称, auction.一口价, auction.标价货币);
        notify('交易完成', result.message, 'success');
    };

    const handleCancelListing = (auction: 拍卖品记录 | null = selectedAuction) => {
        if (!auction || auction.卖家ID !== playerId) return;
        const returnedItem = {
            ...auction.物品,
            ID: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        };
        const nextCharacter = {
            ...character,
            物品列表: [...(Array.isArray(character?.物品列表) ? character.物品列表 : []), returnedItem],
        };
        const nextState = appendRecord({
            ...auctionState,
            拍卖品列表: auctionState.拍卖品列表.map((entry) => entry.ID === auction.ID ? { ...entry, 状态: '已下架' as const } : entry),
        }, 创建交易记录('撤回', '撤回寄售', `「${auction.物品?.名称 || '无名物品'}」已回到背包。`));
        updateAuctionState(nextState);
        onCharacterChange(nextCharacter);
        console.info('[拍卖行交易] 撤回寄售', auction.物品?.名称);
        notify('已撤回寄售', `「${auction.物品?.名称 || '无名物品'}」已回到背包。`, 'success');
    };

    const handleYahangBuyout = (auction: 拍卖品记录 | null = selectedAuction) => {
        if (!auction || auction.卖家ID !== playerId) return;
        const currency = auction.标价货币 || '铜钱';
        const income = Math.max(1, Math.floor(读数(auction.一口价 || auction.当前价格) * 0.82));
        const copperIncome = income * (currency === '金元宝' ? 100000 : currency === '银子' ? 1000 : 1);
        const nextCharacter = {
            ...character,
            金钱: {
                金元宝: Math.floor((totalCopper + copperIncome) / 100000),
                银子: Math.floor(((totalCopper + copperIncome) % 100000) / 1000),
                铜钱: (totalCopper + copperIncome) % 1000,
            },
        };
        const settledAuction: 拍卖品记录 = {
            ...auction,
            状态: '已成交',
            购买者名称: '万宝牙行',
            成交时间: Date.now(),
        };
        const nextState = appendRecord({
            ...auctionState,
            拍卖品列表: auctionState.拍卖品列表.map((entry) => entry.ID === auction.ID ? settledAuction : entry),
        }, settledAuction);
        updateAuctionState(nextState);
        onCharacterChange(nextCharacter);
        console.info('[拍卖行交易] 牙行收购', auction.物品?.名称, income, currency);
        notify('牙行收购', `牙行以 ${格式化拍卖货币(income, currency)} 收走了这件货。`, 'success');
    };

    const handleSell = () => {
        if (!sellItemId) {
            notify('上架失败', '请选择要寄售的物品。', 'error');
            return;
        }
        const result = 上架背包物品(character, sellItemId, undefined, '铜钱', marketList);
        if (!result.ok) {
            notify('上架失败', result.message, 'error');
            return;
        }
        const nextState = appendRecord({
            ...auctionState,
            拍卖品列表: [result.auction, ...(auctionState.拍卖品列表 || [])],
        }, 创建交易记录('寄售', '送入牙行', result.message));
        updateAuctionState(nextState);
        onCharacterChange(result.nextCharacter);
        setSellItemId('');
        console.info('[拍卖行交易] 寄售上架', result.auction.物品?.名称, result.marketPrice, '铜钱');
        notify('寄售成功', result.message, 'success');
    };

    const handleGenerateItemImage = async (auction: 拍卖品记录) => {
        if (!auction?.物品 || generatingItemId) return;
        const item = auction.物品;
        setGeneratingItemId(auction.ID);
        notify('物品生图已开始', `正在为「${item.名称 || '无名物品'}」生成图标。`, 'info');
        try {
            const { nextItem } = await 生成物品图标(item as any, apiConfig, {
                source: 'manual',
                sourceLocation: '拍卖行',
                force: true
            });
            const nextState: 拍卖行状态 = {
                ...auctionState,
                拍卖品列表: auctionState.拍卖品列表.map((entry) => entry.ID === auction.ID ? { ...entry, 物品: nextItem } : entry),
            };
            updateAuctionState(nextState);
            notify('物品生图完成', `「${item.名称 || '无名物品'}」的图标已写入拍卖行物品档案。`, 'success');
        } catch (error: any) {
            const message = typeof error?.message === 'string' ? error.message : '图片生成失败';
            notify('物品生图失败', message, 'error');
        } finally {
            setGeneratingItemId('');
        }
    };

    const marketList = auctionState.行情列表 || [];
    const recentRecords = (auctionState.交易记录 || []).slice(0, 3);
    const canAfford = (entry: 拍卖品记录) => {
        const unit = entry.标价货币 === '金元宝' ? 100000 : entry.标价货币 === '银子' ? 1000 : 1;
        return totalCopper >= 读数(entry.一口价) * unit;
    };
    const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, entry: 拍卖品记录) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setSelectedAuctionId(entry.ID);
        }
    };

    return (
        <div className={`fixed inset-0 z-[210] flex items-center justify-center bg-black ${isMobile ? 'p-2' : 'p-4'}`}>
            <div className={`relative flex w-full flex-col overflow-hidden border border-wuxia-gold/25 bg-[#090806] shadow-[0_0_70px_rgba(0,0,0,0.85)] ${isMobile ? 'h-[92vh] rounded-xl' : 'h-[90vh] max-w-7xl rounded-2xl'}`}>
                <div className={`flex shrink-0 items-center justify-between border-b border-wuxia-gold/15 bg-[#16110a] ${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                    <div className="min-w-0">
                        <div className={`font-serif font-bold text-wuxia-gold ${isMobile ? 'text-base tracking-[0.18em]' : 'text-lg tracking-[0.32em]'}`}>天下拍卖行</div>
                        <div className={`mt-1 text-xs tracking-[0.16em] text-wuxia-gold/45 ${isMobile ? 'hidden' : ''}`}>AUCTION HOUSE</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden max-w-[560px] rounded border border-wuxia-gold/20 bg-[#0f0c08] px-3 py-1.5 text-xs text-wuxia-gold/80 sm:block">
                            {格式化金钱折算(money)}
                        </div>
                        <button type="button" onClick={handleRefresh} className={`rounded-lg border border-emerald-500/40 bg-[#103522] text-xs text-emerald-100 transition-colors hover:border-emerald-300/60 ${isMobile ? 'px-2 py-1.5' : 'px-3 py-1.5'}`}>
                            刷新市场
                        </button>
                        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-[#0c0c0c] text-gray-400 transition-colors hover:border-red-400 hover:text-red-300" aria-label="关闭拍卖行">
                            ×
                        </button>
                    </div>
                </div>

                <div className="auction-house-body flex min-h-0 flex-1 flex-col bg-[#0b0907]">
                    <section className={`shrink-0 border-b border-wuxia-gold/10 bg-[#0e0b08] ${isMobile ? 'p-2' : 'p-3'}`}>
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                            <div>
                                <div className="mb-2 flex items-center justify-between text-xs text-wuxia-gold/70">
                                    <span>分类</span>
                                    <span>{activeAuctions.length} 件在售</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {分类列表.map((category) => (
                                        <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`shrink-0 rounded-lg border transition-colors ${isMobile ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${activeCategory === category ? 'border-wuxia-gold/55 bg-[#332812] text-wuxia-gold' : 'border-white/10 bg-[#151515] text-gray-200 hover:border-wuxia-gold/35'}`}>
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={`${isMobile ? 'hidden' : ''} rounded-xl border border-wuxia-gold/15 bg-[#11100d] p-2.5`}>
                                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-wuxia-gold/80">
                                    <span>今日行情</span>
                                    <span className="font-normal text-wuxia-gold/45">{marketList.length} 条</span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {marketList.slice(0, 4).map((market) => (
                                        <div key={market.ID} className="min-w-0 rounded-lg border border-amber-400/20 bg-[#2c1c08] px-3 py-2">
                                            <div className="flex items-center justify-between gap-2 text-xs">
                                                <span className="truncate font-semibold text-amber-100">{market.标题}</span>
                                                <span className={`shrink-0 font-mono ${market.价格倍率 >= 1 ? 'text-emerald-300' : 'text-sky-300'}`}>
                                                    ×{market.价格倍率.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="mt-1 truncate text-[11px] text-gray-300">{market.描述}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={`mt-2 grid gap-2 ${isMobile ? 'grid-cols-2' : 'md:grid-cols-[1fr_120px_120px_130px_auto]'}`}>
                            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 排序)} className={`rounded border border-wuxia-gold/20 bg-[#0d0d0d] px-2 py-2 text-xs text-wuxia-gold outline-none ${isMobile ? 'col-span-2' : ''}`}>
                                <option>热点优先</option>
                                <option>最新上架</option>
                                <option>价格升序</option>
                                <option>价格降序</option>
                                <option>品质优先</option>
                            </select>
                            <input value={minPrice} onChange={(event) => setMinPrice(event.target.value)} inputMode="numeric" placeholder="最低价" className="rounded border border-white/10 bg-[#0d0d0d] px-2 py-2 text-xs text-gray-200 outline-none focus:border-wuxia-gold/40" />
                            <input value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} inputMode="numeric" placeholder="最高价" className="rounded border border-white/10 bg-[#0d0d0d] px-2 py-2 text-xs text-gray-200 outline-none focus:border-wuxia-gold/40" />
                            <label className="flex items-center gap-2 rounded border border-white/10 bg-[#151515] px-3 py-2 text-xs text-gray-300">
                                <input type="checkbox" checked={hotOnly} onChange={(event) => setHotOnly(event.target.checked)} />
                                只看热点
                            </label>
                            <div className="rounded border border-wuxia-gold/15 bg-[#11100d] px-3 py-2 text-xs text-wuxia-gold/65">{displayAuctions.length} 件</div>
                        </div>
                    </section>

                    <main className={`auction-house-list-panel min-h-0 flex-1 overflow-y-auto custom-scrollbar ${isMobile ? 'p-2' : 'p-3'}`}>
                        <div className={`auction-house-item-grid grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-3 xl:grid-cols-3'}`}>
                            {displayAuctions.map((entry) => {
                                const styles = getRarityStyles(entry.物品?.品质 || '');
                                const selected = selectedAuction?.ID === entry.ID;
                                const isPlayerListing = entry.卖家ID === playerId;
                                const affordable = canAfford(entry);
                                const itemIconImage = 获取物品已选图标地址(entry.物品);
                                const isGenerating = generatingItemId === entry.ID;
                                return (
                                    <div key={entry.ID} role="button" tabIndex={0} onClick={() => setSelectedAuctionId(entry.ID)} onKeyDown={(event) => handleCardKeyDown(event, entry)} className={`group relative overflow-hidden rounded-xl border ${isMobile ? 'p-2' : 'p-3'} text-left transition-all ${selected ? 'border-wuxia-gold/65 bg-[#332812] shadow-[0_0_22px_rgba(212,175,55,0.16)]' : `${styles.border} bg-[#121212] hover:border-wuxia-gold/35`} cursor-pointer outline-none focus:border-wuxia-gold/60`}>
                                        {entry.是否限时热点 && <div className="absolute right-2 top-2 rounded-full border border-amber-300/40 bg-[#5b3608] px-2 py-0.5 text-[10px] font-bold text-amber-100">热点</div>}
                                        <div className={`flex items-start justify-between ${isMobile ? 'gap-2 pr-0' : 'gap-3 pr-10'}`}>
                                            <div className={`${isMobile ? 'h-14 w-14' : 'h-20 w-20'} shrink-0 overflow-hidden rounded-lg border border-wuxia-gold/15 bg-black/35 flex items-center justify-center`}>
                                                {itemIconImage ? (
                                                    <img src={itemIconImage} alt={entry.物品?.名称 || '物品图标'} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px] text-wuxia-gold/45">{entry.物品?.类型 || '物'}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className={`truncate font-serif ${isMobile ? 'text-xs' : 'text-sm'} font-bold ${getRarityNameClass(entry.物品?.品质 || '')}`}>{entry.物品?.名称 || '无名物品'}</div>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {(entry.市场标签 || []).slice(0, isMobile ? 1 : 3).map((tag) => (
                                                        <span key={tag} className="rounded border border-wuxia-gold/15 bg-[#0d0d0d] px-1.5 py-0.5 text-[10px] text-wuxia-gold/70">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`${isMobile ? 'mt-2 line-clamp-1 min-h-[1rem] text-[10px] leading-4' : 'mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-5'} text-gray-300`}>{entry.物品?.描述 || entry.来源描述 || '暂无描述。'}</div>
                                        <div className={`grid grid-cols-2 ${isMobile ? 'mt-2 gap-1 text-[10px]' : 'mt-3 gap-2 text-[11px]'} text-gray-300`}>
                                            <div className={`rounded border border-white/8 bg-black/20 ${isMobile ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}>
                                                <span className="text-gray-500">类型 </span>{entry.物品?.类型 || '杂物'}
                                            </div>
                                            <div className={`rounded border border-white/8 bg-black/20 ${isMobile ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}>
                                                <span className="text-gray-500">品质 </span>{entry.物品?.品质 || '凡品'}
                                            </div>
                                            <div className={`rounded border border-white/8 bg-black/20 ${isMobile ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}>
                                                <span className="text-gray-500">卖家 </span><span className="truncate">{entry.卖家名称}</span>
                                            </div>
                                            <div className={`rounded border border-white/8 bg-black/20 ${isMobile ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}>
                                                <span className="text-gray-500">到期 </span>{格式化时间(entry.过期时间)}
                                            </div>
                                        </div>
                                        {!isMobile && (entry.来源描述 || entry.关联事件) && (
                                            <div className="mt-2 truncate rounded border border-amber-400/15 bg-[#241806] px-2 py-1.5 text-[11px] text-amber-100/80">
                                                {entry.来源描述}{entry.关联事件 ? ` · ${entry.关联事件}` : ''}
                                            </div>
                                        )}
                                        <div className={`mt-3 flex ${isMobile ? 'flex-col items-stretch' : 'items-center justify-between'} gap-2 border-t border-white/8 pt-3`}>
                                            <span className={`font-mono ${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-wuxia-gold`}>{格式化拍卖货币(entry.一口价, entry.标价货币)}</span>
                                            {isPlayerListing ? (
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); void handleGenerateItemImage(entry); }} disabled={Boolean(generatingItemId)} className="rounded-lg border border-sky-400/35 bg-[#0b2a3a] px-3 py-1.5 text-xs font-semibold text-sky-100 transition-colors hover:border-sky-300/60 disabled:cursor-wait disabled:opacity-60">
                                                        {isGenerating ? '生图中' : (itemIconImage ? '重绘' : '生图')}
                                                    </button>
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); handleCancelListing(entry); }} className="rounded-lg border border-sky-500/40 bg-[#0b2a3a] px-3 py-1.5 text-xs font-semibold text-sky-100 transition-colors hover:border-sky-300/60">撤回</button>
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); handleYahangBuyout(entry); }} className="rounded-lg border border-emerald-500/40 bg-[#103522] px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:border-emerald-300/60">收购</button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); void handleGenerateItemImage(entry); }} disabled={Boolean(generatingItemId)} className="rounded-lg border border-sky-400/35 bg-[#0b2a3a] px-3 py-1.5 text-xs font-semibold text-sky-100 transition-colors hover:border-sky-300/60 disabled:cursor-wait disabled:opacity-60">
                                                        {isGenerating ? '生图中' : (itemIconImage ? '重绘' : '生图')}
                                                    </button>
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); handleBuy(entry); }} disabled={!affordable} className="rounded-lg border border-wuxia-gold/35 bg-[#332812] px-3 py-1.5 text-xs font-semibold text-wuxia-gold transition-colors hover:bg-[#443416] disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-900 disabled:text-gray-500">
                                                        {affordable ? '买下' : '钱数不足'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {displayAuctions.length === 0 && (
                            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-wuxia-gold/15 text-sm text-gray-500">
                                当前筛选下暂无货品。
                            </div>
                        )}
                    </main>

                    <section className={`auction-house-trade-panel shrink-0 overflow-hidden border-t border-wuxia-gold/10 bg-[#0e0b08] p-3 ${isMobile ? 'hidden' : ''}`}>
                        <div className="grid gap-3 xl:grid-cols-[1fr_0.9fr_1.1fr]">
                        <section className="min-w-0 rounded-xl border border-wuxia-gold/15 bg-[#11100d] p-3">
                            <div className="mb-3 text-sm font-semibold text-wuxia-gold">寄售背包物品</div>
                            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_110px] xl:grid-cols-1">
                                <select value={sellItemId} onChange={(event) => {
                                    const itemId = event.target.value;
                                    setSellItemId(itemId);
                                }} className="w-full rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-gray-200 outline-none focus:border-wuxia-gold/40">
                                    <option value="">选择物品</option>
                                    {bagItems.map((item: any) => (
                                        <option key={String(item?.ID)} value={String(item?.ID)}>{item?.名称 || '无名物品'} · {item?.品质 || '未知'} · 市价 {计算物品市场铜钱(item, marketList)} 铜</option>
                                    ))}
                                </select>
                                <button type="button" onClick={handleSell} className="w-full rounded-lg border border-emerald-500/40 bg-[#103522] px-4 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:border-emerald-300/60">市价寄售</button>
                                <div className="md:col-span-2 xl:col-span-1 text-[11px] leading-5 text-emerald-100/65">
                                    价格由物品价值、品质和今日行情自动折算；寄售后下回合自动成交入账。
                                </div>
                            </div>
                        </section>

                        <section className="min-w-0 overflow-hidden rounded-xl border border-sky-400/25 bg-[#0a2330] p-3">
                            <div className="mb-3 text-sm font-semibold text-sky-200">自动换兑</div>
                            <div className="rounded-lg border border-sky-400/20 bg-black/20 px-3 py-2 font-mono text-sm text-sky-50">
                                {格式化铜钱总值(totalCopper)}
                            </div>
                            <div className="mt-2 text-[11px] leading-5 text-sky-100/65">
                                购买、出售和寄售结算都会自动折算总铜钱，不再需要手动选择铜钱、银子或元宝换兑。
                            </div>
                        </section>

                        <section className="min-w-0 rounded-xl border border-wuxia-gold/15 bg-[#11100d] p-3">
                            <div className="mb-3 flex items-center justify-between text-sm font-semibold text-wuxia-gold">
                                <span>最近成交</span>
                                <span className="text-[10px] font-normal text-wuxia-gold/45">{(auctionState.交易记录 || []).length}</span>
                            </div>
                            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
                                {recentRecords.map((record: any) => (
                                    <div key={`${record.ID}-${record.成交时间 || record.时间 || ''}`} className="rounded-lg border border-white/8 bg-[#151515] p-2 text-xs">
                                        {'物品' in record ? (
                                            <>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`min-w-0 truncate ${getRarityNameClass(record.物品?.品质 || '')}`}>{record.物品?.名称 || '无名物品'}</span>
                                                    <span className="shrink-0 font-mono text-wuxia-gold/80">{格式化拍卖货币(record.一口价 || record.当前价格, record.标价货币)}</span>
                                                </div>
                                                <div className="mt-1 truncate text-[10px] text-gray-500">{record.卖家名称} → {record.购买者名称 || '买家'}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-gray-200">{record.标题}</div>
                                                <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500">{record.描述}</div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {recentRecords.length === 0 && <div className="rounded-lg border border-dashed border-white/10 py-5 text-center text-xs text-gray-400">暂无成交记录</div>}
                            </div>
                        </section>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AuctionHouseModal;
