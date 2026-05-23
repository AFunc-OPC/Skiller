# ClawHub 导入到技能中心

## 概述

在 ClawHub 技能列表的批量模式工具栏中添加「导入到技能中心」快捷按钮，点击后弹出确认弹框，展示选中的技能（区分已存在/新增），支持添加标签，样式和交互参照仓库管理中的 `repo-confirm-modal repo-import-confirm-modal`。

## UI 变更

### skill-multi-inline-actions 新增按钮

在全选按钮后添加「导入到技能中心」按钮（Download 图标 + 文字），选中数量 > 0 时可用，否则 disabled。点击后弹出确认弹框。

### 移除底部 clawhub-batch-bar

整个 `clawhub-batch-bar` 删除，其导入功能由 inline-actions 按钮替代。

## 确认弹框

复用 `repo-confirm-modal repo-import-confirm-modal` 的 CSS 类和结构：

```
repo-overlay（遮罩层，点击关闭）
repo-confirm-modal repo-import-confirm-modal
  ├─ repo-confirm-icon repo-confirm-icon-warning（警告图标）
  ├─ h3 "确认导入"
  ├─ repo-import-confirm-content
  │   ├─ repo-import-existing（已存在的技能，琥珀色背景）
  │   ├─ repo-import-new（新增的技能，绿色背景）
  │   └─ repo-import-tag-section（标签选择器，含搜索和树形结构）
  └─ repo-confirm-actions
      ├─ repo-btn-ghost "取消"
      └─ repo-btn-primary "确认导入"
```

## 交互流程

1. 用户进入批量模式 → 选中技能 → 点击「导入到技能中心」
2. 调用 `checkDuplicates(slugs)` 检测重复
3. 弹框展示：已存在技能（会覆盖）+ 新增技能 + 可选标签
4. 用户可选标签 → 点击「确认导入」
5. 调用 `importSkills(sourceId, slugs, overwrite=true)`，导入后对每个技能应用标签
6. 导入完成后关闭弹框，清空选择，刷新数据

## 状态管理

在 SkillGrid 中新增状态：

- `importConfirmOpen` — 弹框开关
- `importConfirmData` — `{ existing: string[], newSkills: string[] }`（slug 列表）
- `selectedTagIds` — 选中的标签 ID
- `tagSearchKeyword` — 标签搜索关键词
- `expandedTagIds` — 展开的标签节点

## 标签应用

导入成功后，通过 `useSkillContext().updateSkillTags` 为每个导入的技能添加选中的标签，与 RepositoryDetailDrawer 一致。

## 涉及文件

| 文件 | 变更 |
|------|------|
| `src/components/ClawHub/SkillGrid.tsx` | 添加导入按钮、确认弹框、状态管理、标签选择逻辑；移除 batch-bar |
| `src/index.css` | 可能需要微调弹框在 ClawHub 上下文中的样式 |

## 实现方案

方案 A（已选）：在 SkillGrid 中内联弹框，直接复用 repo-import-confirm-modal 的 CSS 类，不抽取共享组件。ClawHub 的数据类型（slug）和导入 API 与仓库管理不同，代码重复量极少。
