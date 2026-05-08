import { describe, expect, it } from 'vitest';
import { 默认ComfyUI工作流JSON } from '../data/defaultComfyWorkflow';
import { 默认功能模型占位, 规范化接口设置 } from '../utils/apiConfig';

describe('默认 ComfyUI 生图配置', () => {
    it('uses the bundled z-image turbo workflow as the default image workflow', () => {
        const workflow = JSON.parse(默认功能模型占位.ComfyUI工作流JSON);

        expect(默认功能模型占位.文生图后端类型).toBe('comfyui');
        expect(默认功能模型占位.ComfyUI工作流JSON).toBe(默认ComfyUI工作流JSON);
        expect(workflow['45'].inputs.text).toBe('__PROMPT__');
        expect(workflow['41'].inputs.width).toBe('__WIDTH__');
        expect(workflow['41'].inputs.height).toBe('__HEIGHT__');
        expect(workflow['44'].inputs.seed).toBe('__SEED__');
    });

    it('fills the default workflow when old settings have no ComfyUI workflow', () => {
        const settings = 规范化接口设置({
            功能模型占位: {
                文生图后端类型: 'openai',
                文生图模型使用模型: '',
                文生图模型API地址: '',
                文生图模型API密钥: '',
                ComfyUI工作流JSON: ''
            }
        });

        expect(settings.功能模型占位.文生图后端类型).toBe('comfyui');
        expect(settings.功能模型占位.ComfyUI工作流JSON).toBe(默认ComfyUI工作流JSON);
    });
});
