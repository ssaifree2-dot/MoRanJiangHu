import React from 'react';
import {
    保存拍卖行状态,
    上架背包物品,
    执行货币换兑,
    拍卖品记录,
    拍卖行状态,
    拍卖货币,
    拍卖货币列表,
    格式化拍卖货币,
    清理并补货,
    生成行情列表,
    创建交易记录,
    购买拍卖品,
} from '../../../services/auctionHouse';
import { getRarityNameClass, getRarityStyles } from '../../ui/rarityStyles';

interface Props {
    character: any;
    auctionState: 拍卖行状态;
    onAuctionStateChange: (state: 拍卖行状态) => void;
    onCharacterChange: (nextCharacter: any) => void;
    onNotify?: (title: string, message: string, tone?: 'info' | 'success' | 'error') => void;
    onClose: () => void;
    isMobile?: boolean;
    storageScope?: string;
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
}) => {
    const [activeCategory, setActiveCategory] = React.useState<分类>('全部');
    const [sortBy, setSortBy] = React.useState<排序>('热点优先');
    const [selectedAuctionId, setSelectedAuctionId] = React.useState<string>('');
    const [sellItemId, setSellItemId] = React.useState<string>('');
    const [sellPrice, setSellPrice] = React.useState<string>('');
    const [sellCurrency, setSellCurrency] = React.useState<拍卖货币>('铜钱');
    const [minPrice, setMinPrice] = React.useState('');
    const [maxPrice, setMaxPrice] = React.useState('');
    const [hotOnly, setHotOnly] = React.useState(false);
    const [exchangeFrom, setExchangeFrom] = React.useState<拍卖货币>('银子');
    const [exchangeTo, setExchangeTo] = React.useState<拍卖货币>('铜钱');
    const [exchangeAmount, setExchangeAmount] = React.useState('');

    const bagItems = React.useMemo(() => 取背包物品(character), [character]);
    const money = character?.金钱 || {};
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
        const nextCharacter = {
            ...character,
            金钱: {
                ...(character?.金钱 || {}),
                [currency]: 读数(character?.金钱?.[currency]) + income,
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
        const price = Math.floor(Number(sellPrice));
        if (!sellItemId) {
            notify('上架失败', '请选择要寄售的物品。', 'error');
            return;
        }
        if (!Number.isFinite(price) || price <= 0) {
            notify('上架失败', '请填写有效的一口价。', 'error');
            return;
        }
        const result = 上架背包物品(character, sellItemId, price, sellCurrency);
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
        setSellPrice('');
        console.info('[拍卖行交易] 寄售上架', result.auction.物品?.名称, price, sellCurrency);
        notify('寄售成功', result.message, 'success');
    };

    const handleExchange = () => {
        const result = 执行货币换兑(character, exchangeFrom, exchangeTo, Number(exchangeAmount));
        if (!result.ok) {
            notify('换兑失败', result.message, 'error');
            return;
        }
        const nextState = appendRecord(auctionState, 创建交易记录('换兑', '牙行换兑', result.message));
        updateAuctionState(nextState);
        onCharacterChange(result.nextCharacter);
        setExchangeAmount('');
        console.info('[拍卖行交易] 货币换兑', exchangeFrom, exchangeTo, exchangeAmount);
        notify('换兑完成', result.message, 'success');
    };

    const marketList = auctionState.行情列表 || [];
    const recentRecords = (auctionState.交易记录 || []).slice(0, 3);
    const canAfford = (entry: 拍卖品记录) => 读数(money[entry.标价货币]) >= 读数(entry.一口价);
    const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, entry: 拍卖品记录) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setSelectedAuctionId(entry.ID);
        }
    };

    return (
        <div className={`fixed inset-0 z-[210] flex items-center justify-center bg-black ${isMobile ? 'p-2' : 'p-4'}`}>
            <div className={`relative flex w-full flex-col overflow-hidden border border-wuxia-gold/25 bg-[#090806] shadow-[0_0_70px_rgba(0,0,0,0.85)] ${isMobile ? 'h-[92vh] rounded-xl' : 'h-[90vh] max-w-7xl rounded-2xl'}`}>
                <div className="flex shrink-0 items-center justify-between border-b border-wuxia-gold/15 bg-[#16110a] px-4 py-3">
                    <div className="min-w-0">
                        <div className="font-serif text-lg font-bold tracking-[0.32em] text-wuxia-gold">天下拍卖行</div>
                        <div className="mt-1 text-xs tracking-[0.16em] text-wuxia-gold/45">AUCTION HOUSE</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden rounded border border-wuxia-gold/20 bg-[#0f0c08] px-3 py-1.5 text-xs text-wuxia-gold/80 sm:block">
                            铜钱 {读数(money.铜钱).toLocaleString('zh-CN')} / 银子 {读数(money.银子).toLocaleString('zh-CN')} / 元宝 {读数(money.金元宝).toLocaleString('zh-CN')}
                        </div>
                        <button type="button" onClick={handleRefresh} className="rounded-lg border border-emerald-500/40 bg-[#103522] px-3 py-1.5 text-xs text-emerald-100 transition-colors hover:border-emerald-300/60">
                            刷新市场
                        </button>
                        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-700 bg-[#0c0c0c] text-gray-400 transition-colors hover:border-red-400 hover:text-red-300" aria-label="关闭拍卖行">
                            ×
                        </button>
                    </div>
                </div>

                <div className="auction-house-body flex min-h-0 flex-1 flex-col bg-[#0b0907]">
                    <section className="shrink-0 border-b border-wuxia-gold/10 bg-[#0e0b08] p-3">
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                            <div>
                                <div className="mb-2 flex items-center justify-between text-xs text-wuxia-gold/70">
                                    <span>分类</span>
                                    <span>{activeAuctions.length} 件在售</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {分类列表.map((category) => (
                                        <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`shrink-0 rounded-lg border px-3 py-2 text-sm transition-colors ${activeCategory === category ? 'border-wuxia-gold/55 bg-[#332812] text-wuxia-gold' : 'border-white/10 bg-[#151515] text-gray-200 hover:border-wuxia-gold/35'}`}>
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-wuxia-gold/15 bg-[#11100d] p-2.5">
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

                        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_120px_120px_130px_auto]">
                            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 排序)} className="rounded border border-wuxia-gold/20 bg-[#0d0d0d] px-2 py-2 text-xs text-wuxia-gold outline-none">
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

                    <main className="auction-house-list-panel min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
                        <div className={`auction-house-item-grid grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 xl:grid-cols-3'}`}>
                            {displayAuctions.map((entry) => {
                                const styles = getRarityStyles(entry.物品?.品质 || '');
                                const selected = selectedAuction?.ID === entry.ID;
                                const isPlayerListing = entry.卖家ID === playerId;
                                const affordable = canAfford(entry);
                                return (
                                    <div key={entry.ID} role="button" tabIndex={0} onClick={() => setSelectedAuctionId(entry.ID)} onKeyDown={(event) => handleCardKeyDown(event, entry)} className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all ${selected ? 'border-wuxia-gold/65 bg-[#332812] shadow-[0_0_22px_rgba(212,175,55,0.16)]' : `${styles.border} bg-[#121212] hover:border-wuxia-gold/35`} cursor-pointer outline-none focus:border-wuxia-gold/60`}>
                                        {entry.是否限时热点 && <div className="absolute right-2 top-2 rounded-full border border-amber-300/40 bg-[#5b3608] px-2 py-0.5 text-[10px] font-bold text-amber-100">热点</div>}
                                        <div className="flex items-start justify-between gap-3 pr-10">
                                            <div className="min-w-0">
                                                <div className={`truncate font-serif text-sm font-bold ${getRarityNameClass(entry.物品?.品质 || '')}`}>{entry.物品?.名称 || '无名物品'}</div>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {(entry.市场标签 || []).slice(0, 3).map((tag) => (
                                                        <span key={tag} className="rounded border border-wuxia-gold/15 bg-[#0d0d0d] px-1.5 py-0.5 text-[10px] text-wuxia-gold/70">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-gray-300">{entry.物品?.描述 || entry.来源描述 || '暂无描述。'}</div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-300">
                                            <div className="rounded border border-white/8 bg-black/20 px-2 py-1.5">
                                                <span className="text-gray-500">类型 </span>{entry.物品?.类型 || '杂物'}
                                            </div>
                                            <div className="rounded border border-white/8 bg-black/20 px-2 py-1.5">
                                                <span className="text-gray-500">品质 </span>{entry.物品?.品质 || '凡品'}
                                            </div>
                                            <div className="rounded border border-white/8 bg-black/20 px-2 py-1.5">
                                                <span className="text-gray-500">卖家 </span><span className="truncate">{entry.卖家名称}</span>
                                            </div>
                                            <div className="rounded border border-white/8 bg-black/20 px-2 py-1.5">
                                                <span className="text-gray-500">到期 </span>{格式化时间(entry.过期时间)}
                                            </div>
                                        </div>
                                        {(entry.来源描述 || entry.关联事件) && (
                                            <div className="mt-2 truncate rounded border border-amber-400/15 bg-[#241806] px-2 py-1.5 text-[11px] text-amber-100/80">
                                                {entry.来源描述}{entry.关联事件 ? ` · ${entry.关联事件}` : ''}
                                            </div>
                                        )}
                                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/8 pt-3">
                                            <span className="font-mono text-sm font-semibold text-wuxia-gold">{格式化拍卖货币(entry.一口价, entry.标价货币)}</span>
                                            {isPlayerListing ? (
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); handleCancelListing(entry); }} className="rounded-lg border border-sky-500/40 bg-[#0b2a3a] px-3 py-1.5 text-xs font-semibold text-sky-100 transition-colors hover:border-sky-300/60">撤回</button>
                                                    <button type="button" onClick={(event) => { event.stopPropagation(); handleYahangBuyout(entry); }} className="rounded-lg border border-emerald-500/40 bg-[#103522] px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:border-emerald-300/60">收购</button>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={(event) => { event.stopPropagation(); handleBuy(entry); }} disabled={!affordable} className="rounded-lg border border-wuxia-gold/35 bg-[#332812] px-3 py-1.5 text-xs font-semibold text-wuxia-gold transition-colors hover:bg-[#443416] disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-900 disabled:text-gray-500">
                                                    {affordable ? '买下' : '钱数不足'}
                                                </button>
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

                    <section className="auction-house-trade-panel shrink-0 overflow-hidden border-t border-wuxia-gold/10 bg-[#0e0b08] p-3">
                        <div className="grid gap-3 xl:grid-cols-[1fr_0.9fr_1.1fr]">
                        <section className="min-w-0 rounded-xl border border-wuxia-gold/15 bg-[#11100d] p-3">
                            <div className="mb-3 text-sm font-semibold text-wuxia-gold">寄售背包物品</div>
                            <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_110px] xl:grid-cols-1">
                                <select value={sellItemId} onChange={(event) => {
                                    const itemId = event.target.value;
                                    setSellItemId(itemId);
                                    const item = bagItems.find((candidate: any) => String(candidate?.ID) === itemId);
                                    if (item && !sellPrice) setSellPrice(String(Math.max(1, Math.floor(读数(item?.价值, 100) * 1.2))));
                                }} className="w-full rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-gray-200 outline-none focus:border-wuxia-gold/40">
                                    <option value="">选择物品</option>
                                    {bagItems.map((item: any) => (
                                        <option key={String(item?.ID)} value={String(item?.ID)}>{item?.名称 || '无名物品'} · {item?.品质 || '未知'}</option>
                                    ))}
                                </select>
                                <div className="grid grid-cols-[1fr_92px] gap-2">
                                    <input value={sellPrice} onChange={(event) => setSellPrice(event.target.value)} inputMode="numeric" placeholder="一口价" className="w-full rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-gray-200 outline-none focus:border-wuxia-gold/40" />
                                    <select value={sellCurrency} onChange={(event) => setSellCurrency(event.target.value as 拍卖货币)} className="rounded-lg border border-white/10 bg-[#0d0d0d] px-2 py-2 text-sm text-gray-200 outline-none">
                                        {拍卖货币列表.map((currency) => <option key={currency}>{currency}</option>)}
                                    </select>
                                </div>
                                <button type="button" onClick={handleSell} className="w-full rounded-lg border border-emerald-500/40 bg-[#103522] px-4 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:border-emerald-300/60">送入牙行</button>
                            </div>
                        </section>

                        <section className="min-w-0 overflow-hidden rounded-xl border border-sky-400/25 bg-[#0a2330] p-3">
                            <div className="mb-3 text-sm font-semibold text-sky-200">牙行换兑</div>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={exchangeFrom} onChange={(event) => setExchangeFrom(event.target.value as 拍卖货币)} className="rounded-lg border border-white/10 bg-[#0d0d0d] px-2 py-2 text-xs text-gray-200 outline-none">
                                    {拍卖货币列表.map((currency) => <option key={currency}>{currency}</option>)}
                                </select>
                                <select value={exchangeTo} onChange={(event) => setExchangeTo(event.target.value as 拍卖货币)} className="rounded-lg border border-white/10 bg-[#0d0d0d] px-2 py-2 text-xs text-gray-200 outline-none">
                                    {拍卖货币列表.map((currency) => <option key={currency}>{currency}</option>)}
                                </select>
                            </div>
                            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                                <input value={exchangeAmount} onChange={(event) => setExchangeAmount(event.target.value)} inputMode="numeric" placeholder="数目" className="min-w-0 rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-gray-200 outline-none focus:border-sky-400/40" />
                                <button type="button" onClick={handleExchange} className="w-full rounded-lg border border-sky-400/40 bg-[#0b2a3a] px-3 py-2 text-sm font-semibold text-sky-100">换兑</button>
                            </div>
                            <div className="mt-2 text-[11px] leading-5 text-sky-100/60">柜上明牌，过手抽三分水牌。</div>
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
