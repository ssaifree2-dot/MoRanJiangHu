import React from 'react';
import { 世界数据结构 } from '../../../models/world';
import { 环境信息结构 } from '../../../models/environment';
import LocationBrowser from './LocationBrowser';

interface Props {
    world: 世界数据结构;
    env: 环境信息结构;
    socialList?: any[];
    playerName?: string;
    debugEnabled?: boolean;
    onClose: () => void;
    onOpenPerson?: (person: any) => void;
    onRegenerateMap?: () => Promise<boolean>;
    rawResponse?: string;
}

const MapModal: React.FC<Props> = ({ world, env, onClose, onRegenerateMap, rawResponse, socialList }) => (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/95 p-2 backdrop-blur-sm animate-fadeIn">
        <div className="relative flex h-[95vh] max-h-[95vh] w-full max-w-[min(1680px,calc(100vw-16px))] flex-col overflow-hidden rounded-2xl border border-wuxia-gold/20 bg-ink-black/95 shadow-[0_0_80px_rgba(0,0,0,0.9)]">
            <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[url('/assets/images/ui/paper-texture.png')] opacity-[0.035] mix-blend-overlay" />
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-wuxia-gold/10 to-transparent" />
            </div>

            <div className="relative z-10 flex min-h-0 shrink-0 items-center justify-between gap-3 border-b border-wuxia-gold/10 bg-black/55 px-5 py-4">
                <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-wuxia-gold/35 bg-wuxia-gold/10 text-lg font-bold text-wuxia-gold">图</span>
                        <div className="min-w-0">
                            <h3 className="truncate font-serif text-xl font-bold tracking-[0.18em] text-wuxia-gold">江湖舆图</h3>
                            <div className="mt-1 truncate text-[11px] tracking-widest text-gray-400">
                                {env?.大地点 || '未知'} / {env?.中地点 || '未知'} / {env?.小地点 || '未知'} / {env?.具体地点 || '未知'}
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-black/60 text-gray-400 transition-all hover:rotate-90 hover:border-red-400 hover:text-red-300"
                    title="关闭"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="relative z-10 min-h-0 flex-1 overflow-hidden p-3">
                <LocationBrowser
                    world={world}
                    env={env}
                    onRegenerateMap={onRegenerateMap}
                    rawResponse={rawResponse}
                    socialList={socialList}
                />
            </div>
        </div>
    </div>
);

export default MapModal;
