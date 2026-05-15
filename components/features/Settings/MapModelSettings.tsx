import React, { useEffect, useMemo, useState } from 'react';
import { 接口设置结构, 单接口配置结构, 功能模型占位配置结构 } from '../../../types';
import GameButton from '../../ui/GameButton';
import InlineSelect from '../../ui/InlineSelect';
import { 规范化接口设置 } from '../../../utils/apiConfig';

interface Props {
    settings: 接口设置结构;
    onSave: (settings: 接口设置结构) => void;
}

const MapModelSettings: React.FC<Props> = ({ settings, onSave }) => {
    const [form, setForm] = useState<接口设置结构>(() => 规范化接口设置(settings));
    const [modelOptions, setModelOptions] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [message, setMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const normalized = 规范化接口设置(settings);
        setForm(normalized);
        setModelOptions([]);
    }, [settings]);

    const activeConfig = useMemo<单接口配置结构 | null>(() => {
        if (!form.configs.length) return null;
        const selected = form.configs.find((cfg) => cfg.id === form.activeConfigId);
        return selected || form.configs[0] || null;
    }, [form.activeConfigId, form.configs]);

    const 地图生成模型 = (form.功能模型占位.地图生成使用模型 || '').trim();
    const 地图生成API地址 = (form.功能模型占位.地图生成API地址 || '').trim();
    const 地图生成API密钥 = (form.功能模型占位.地图生成API密钥 || '').trim();

    const updatePlaceholder = <K extends keyof 功能模型占位配置结构>(key: K, value: 功能模型占位配置结构[K]) => {
        setForm((prev) => ({
            ...prev,
            功能模型占位: {
                ...prev.功能模型占位,
                [key]: value
            }
        }));
    };

    const fetchModelsFromCurrentConfig = async (): Promise<string[] | null> => {
        const resolvedBaseUrl = 地图生成API地址 || (activeConfig?.baseUrl || '');
        const resolvedApiKey = 地图生成API密钥 || (activeConfig?.apiKey || '');
        if (!resolvedApiKey || !resolvedBaseUrl) {
            setMessage('请先填写可用的 API Key 与 Base URL。');
            return null;
        }
        try {
            const base = resolvedBaseUrl.replace(/\/+$/, '');
            const normalized = base.replace(/\/v1$/i, '');
            const candidateUrls = Array.from(new Set([
                `${normalized}/v1/models`,
                `${normalized}/models`,
                `${base}/models`
            ]));
            for (const url of candidateUrls) {
                const res = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${resolvedApiKey}`
                    }
                });
                if (!res.ok) continue;
                const data = await res.json();
                if (data && Array.isArray(data.data)) {
                    return data.data.map((m: any) => m?.id).filter(Boolean);
                }
            }
            setMessage('获取失败：返回格式错误。');
            return null;
        } catch (error: any) {
            setMessage(`获取失败：${error.message}`);
            return null;
        }
    };

    const handleFetchModels = async () => {
        setLoadingModels(true);
        setMessage('');
        const models = await fetchModelsFromCurrentConfig();
        if (models) {
            setModelOptions(models);
            setMessage('地图生成模型列表获取成功。');
        }
        setLoadingModels(false);
    };

    const handleSave = () => {
        const normalized = 规范化接口设置(form);
        onSave(normalized);
        setForm(normalized);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const mapModelValue = 地图生成模型;
    const mapModelDisplay = mapModelValue || (activeConfig?.model || '');
    const selectOptions = Array.from(new Set(
        [...modelOptions, mapModelValue, activeConfig?.model || '']
            .map((item) => (item || '').trim())
            .filter(Boolean)
    ));

    return (
        <div className="space-y-6 text-sm animate-fadeIn">
            <div className="flex justify-between items-center border-b border-wuxia-gold/30 pb-3 mb-6">
                <h3 className="text-wuxia-gold font-serif font-bold text-xl">地图生成模型</h3>
            </div>

            <div className="rounded-md border border-wuxia-gold/20 bg-black/25 p-4 space-y-4">
                <div className="text-[11px] text-gray-400">
                    当前启用接口配置：{activeConfig?.名称 || '未配置'}。该设置作用于地图弹窗中的"解析地图"功能；留空时复用主剧情接口。
                </div>

                <div className="rounded border border-wuxia-gold/20 bg-wuxia-gold/5 p-3 space-y-1.5 text-[11px]">
                    <div className="text-wuxia-gold font-bold text-xs">提示</div>
                    <div className="text-gray-300">1. 地图生成是对 AI 算力消耗较低的轻量任务，推荐使用 Flash 或 mini 级模型。</div>
                    <div className="text-gray-300">2. 留空则自动复用主剧情接口配置。</div>
                    <div className="text-gray-300">3. 填写独立模型后，地图解析请求将使用该模型。</div>
                </div>

                <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-gray-300">地图生成使用模型</label>
                        <InlineSelect
                            value={mapModelDisplay}
                            options={selectOptions.map((model) => ({ value: model, label: model }))}
                            onChange={(model) => updatePlaceholder('地图生成使用模型', model)}
                            disabled={selectOptions.length === 0}
                            placeholder={selectOptions.length ? '请选择模型' : '请先点击获取列表'}
                            buttonClassName="bg-black/50 border-gray-600 py-2.5"
                        />
                    </div>
                    <GameButton
                        onClick={handleFetchModels}
                        variant="secondary"
                        className="px-4 py-2 text-xs"
                        disabled={loadingModels}
                    >
                        {loadingModels ? '...' : '获取列表'}
                    </GameButton>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-gray-300">地图生成独立 API 地址（可选）</label>
                    <input
                        type="text"
                        value={form.功能模型占位.地图生成API地址 || ''}
                        onChange={(e) => updatePlaceholder('地图生成API地址', e.target.value)}
                        placeholder={activeConfig?.baseUrl || '留空则复用主剧情 Base URL'}
                        className="w-full border p-2 text-white rounded-md outline-none bg-black/50 border-gray-700 focus:border-wuxia-gold"
                    />
                    <div className="text-[11px] text-gray-500">留空则复用主剧情 Base URL。</div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-gray-300">地图生成独立 API 密钥（可选）</label>
                    <input
                        type="password"
                        value={form.功能模型占位.地图生成API密钥 || ''}
                        onChange={(e) => updatePlaceholder('地图生成API密钥', e.target.value)}
                        placeholder={activeConfig?.apiKey ? '留空则复用主剧情 API Key' : 'sk-...'}
                        className="w-full border p-2 text-white rounded-md outline-none bg-black/50 border-gray-700 focus:border-wuxia-gold"
                    />
                    <div className="text-[11px] text-gray-500">留空则复用主剧情 API Key。</div>
                </div>

                {!mapModelValue && (
                    <div className="text-[11px] text-gray-400">
                        当前状态：复用主剧情接口（{activeConfig?.model || '未配置'}）。
                    </div>
                )}
            </div>

            {message && <p className="text-xs text-wuxia-cyan animate-pulse">{message}</p>}

            <div className="pt-6 border-t border-wuxia-gold/20 mt-8">
                <GameButton onClick={handleSave} variant="primary" className="w-full">
                    {showSuccess ? '✔ 配置已保存' : '保存设置'}
                </GameButton>
            </div>
        </div>
    );
};

export default MapModelSettings;
