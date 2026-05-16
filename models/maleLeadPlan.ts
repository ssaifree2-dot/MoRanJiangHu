// 檔案路徑: models/maleLeadPlan.ts
export interface 男主阶段推进结构 {
    阶段名: string;
    阶段目标: string[];
    主推男主: string[];
    次推男主: string[];
    禁止越级对象: string[];
    关联剧情任务: string[];
    阶段完成判定: string[];
    切换条件: string[];
}

export interface 男主条目结构 {
    男主姓名: string;
    类型: string;
    当前关系状态: string;
    当前阶段: string;
    已成立事实: string[];
    阶段目标: string[];
    推进方式: string[];
    阻断因素: string[];
    允许突破条件: string[];
    失败后回退: string[];
}

export interface 男主互动事件结构 {
    男主姓名: string;
    事件名: string;
    事件说明: string;
    计划触发时间: string;
    最早触发时间: string;
    最晚触发时间: string;
    前置条件: string[];
    触发条件: string[];
    阻断条件: string[];
    成功结果: string[];
    失败结果: string[];
    关联剧情任务: string[];
    当前状态: string;
}

export interface 男主镜头结构 {
    男主姓名: string;
    镜头标题: string;
    镜头内容: string;
    触发时间: string;
    触发条件: string[];
    关联事件: string[];
    关联剧情任务: string[];
    沉淀内容: string[];
    当前状态: string;
}

export interface 男主剧情规划结构 {
    阶段推进: 男主阶段推进结构[];
    男主条目: 男主条目结构[];
    男主互动事件: 男主互动事件结构[];
    男主镜头规划: 男主镜头结构[];
}
