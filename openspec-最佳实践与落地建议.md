# OpenSpec 最佳实践与落地建议

本文面向准备在个人项目、团队项目或现有代码库中落地 OpenSpec 的场景，重点回答三个问题：

- 怎么用，才不会把 OpenSpec 用成额外负担
- 怎么配，才能让 AI 真正稳定地产出
- 怎么推，才能让团队逐步接受而不是抵触

## 1. 总原则

### 1.1 把 OpenSpec 当作“约束 AI 的最小规范层”

不要把它理解成传统重流程文档体系。它最有价值的地方不是“多写文档”，而是：

- 把需求从聊天记录里拿出来
- 把边界、验收、设计决策结构化
- 让 AI 在实现前后都能对齐同一套上下文

如果你的使用方式让团队觉得“只是多写了四份 md”，通常说明粒度过重了。

### 1.2 先小后大，先轻后重

最佳落地方式不是一上来要求所有需求都走完整流程，而是：

1. 先挑 1 到 2 个中小功能试点
2. 先用默认 `core` 路径跑通闭环
3. 跑顺后再启用扩展 workflow 和自定义 schema

### 1.3 面向存量项目，而不是理想化新项目

OpenSpec 最适合的其实是已有项目，因为：

- 已有代码上下文复杂，AI 更容易偏题
- 多人协作时，仅靠聊天记忆很容易失真
- 变更通常是“改现有行为”，Delta Specs 很合适

## 2. 推荐落地路径

## 2.1 个人开发者

推荐流程：

```text
/opsx:propose -> /opsx:apply -> /opsx:archive
```

建议：

- 先只用 `core` profile
- 不必一开始就写很长的 design
- 把重点放在 `specs` 和 `tasks` 是否足够清晰
- 每次归档后回看 specs 是否真的反映新行为

## 2.2 小团队

推荐流程：

```text
/opsx:explore -> /opsx:propose -> /opsx:apply -> /opsx:verify -> /opsx:archive
```

建议：

- 需求不清时先 `explore`
- 开发前由需求方或负责人确认 `proposal` 和 `specs`
- 合并前要求跑一次 `verify`
- 把 `openspec/changes/` 作为 PR 审阅上下文的一部分

## 2.3 中大型团队

推荐流程：

```text
/opsx:new -> /opsx:continue 或 /opsx:ff -> /opsx:apply -> /opsx:verify -> /opsx:sync -> /opsx:archive
```

建议：

- 开启扩展 workflow
- 引入项目级 `config.yaml`
- 约定 spec domain 划分方式
- 高风险变更必须保留 `design.md`
- 长周期 change 先 `sync` 再继续并行开发

## 3. 工作流选择建议

## 3.1 什么时候用 `core`

适合：

- 个人开发
- 小功能
- 团队刚开始试点
- 不想引入太多流程感

优点：

- 简单
- 上手快
- 用户心智负担低

缺点：

- 对 artifact 的中间控制较弱
- 不适合复杂变更拆解

## 3.2 什么时候启用扩展 workflow

适合：

- 需求复杂
- 需要细粒度审阅 artifact
- 多人同时参与规划和实现
- 并行 change 多，冲突风险高

推荐启用条件：

- 团队已经用 `core` 连续完成 3 到 5 个 change
- 大家已经理解 proposal/specs/design/tasks 的边界

## 3.3 `ff` 和 `continue` 怎么选

用 `/opsx:ff`：

- 需求边界清楚
- 功能规模中小
- 赶时间
- 方案已经比较稳定

用 `/opsx:continue`：

- 需求边界还在收敛
- 希望逐步审阅 proposal/specs/design
- 设计权衡比较多
- 变更风险较高

## 4. 规范怎么写，AI 才更稳定

## 4.1 Specs 写行为，不写实现

好的 spec 应该描述：

- 用户能观察到的行为
- 输入、输出和错误条件
- 边界和约束
- 可被验证的场景

不建议写进 spec 的内容：

- 类名、函数名
- 框架选型
- 具体目录结构
- 逐步实现步骤

这些内容更适合放到 `design.md` 或 `tasks.md`。

## 4.2 Scenarios 一定要可验证

推荐使用 Given/When/Then 思路，即使不是严格模板也要满足：

- 有前置条件
- 有触发动作
- 有明确结果

坏例子：

- “系统应该更友好”
- “页面应该更快”

好例子：

- “当用户 30 分钟无操作后，系统必须使会话失效，并要求重新登录”

## 4.3 Proposal 不要写成需求堆砌

Proposal 的重点不是罗列所有细节，而是回答：

- 为什么做
- 这次具体改什么
- 什么不做
- 影响范围是什么

如果 `proposal.md` 没有明确非目标，后续 scope 很容易失控。

## 4.4 Design 只保留真正影响实现决策的内容

推荐写：

- 关键技术方案
- 重要权衡
- 为什么不用某个替代方案
- 会影响代码结构和验证方式的决策

不建议写：

- 过于细碎的实现流水账
- 任何改动都列成一大段 checklist

## 4.5 Tasks 要足够小，但不要碎成噪音

好的任务拆分应该：

- 一项任务最好能在一个工作时段内完成
- 每项任务最好有明确产出
- 可以被 AI 单步理解和执行

不好的任务拆分：

- 太大：一条任务里包含整个功能
- 太碎：把一个简单函数改动拆成 8 条任务

## 5. Change 粒度建议

## 5.1 一个 change 只做一件逻辑上完整的事

推荐：

- `add-dark-mode`
- `fix-login-redirect`
- `optimize-product-query`

不推荐：

- `update-ui-and-refactor-auth-and-fix-tests`

经验判断：

- 如果一项工作能独立上线、独立验证、独立回滚，就适合独立成一个 change

## 5.2 什么时候应该开新 change

应该开新 change：

- 目标已经变了
- 需求范围明显扩大
- 原 change 已经可以单独完成
- 新增工作会让原 proposal 变得混乱

继续沿用原 change：

- 只是修正实现方式
- 只是收缩范围做 MVP
- 只是基于新认知调整设计

## 6. 团队协作建议

## 6.1 把 change 文件夹视为协作单元

建议每个 PR 都明确对应一个 `openspec/changes/<name>/`，这样可以：

- 让评审先看 intent 再看代码
- 让后来者知道变更的设计原因
- 让归档后沉淀可追溯

## 6.2 PR 审阅顺序建议

推荐顺序：

1. 看 `proposal.md`
2. 看 `specs/`
3. 看 `design.md`
4. 看 `tasks.md`
5. 再看代码改动

这样更容易发现：

- 做偏了
- 漏做了
- 设计与实现不一致

## 6.3 产品、设计、研发的职责建议

产品/需求方更适合主导：

- 为什么做
- 范围边界
- 验收口径

研发更适合主导：

- 技术方案
- 风险识别
- 实现拆解

AI 更适合承担：

- 初稿生成
- 基于上下文补全 artifact
- 按任务实现代码
- 做一致性检查

## 7. 配置建议

## 7.1 一定要写 `openspec/config.yaml`

哪怕只写最基础的上下文，也很有价值。

建议至少包含：

- 技术栈
- API 风格
- 测试框架
- 团队约束
- 架构禁忌

示例：

```yaml
schema: spec-driven

context: |
  Frontend: React + TypeScript
  Backend: Node.js + PostgreSQL
  Testing: Vitest + Playwright
  API style: REST
  Constraint: Do not introduce Redux for local UI state

rules:
  proposal:
    - State scope and non-goals explicitly
  specs:
    - Use behavior-first language
    - Include at least one error scenario for user-facing flows
  design:
    - Record major tradeoffs
  tasks:
    - Keep task size small enough for one implementation step
```

## 7.2 先用项目配置，再考虑自定义 schema

多数团队其实不需要一开始就自定义 schema。

建议顺序：

1. 先用默认 `spec-driven`
2. 用 `config.yaml` 补 context 和 rules
3. 当默认 artifact 流程真的不适配时，再 fork schema

## 7.3 自定义 schema 的适用场景

适合自定义 schema 的情况：

- 你们有固定的额外审查步骤
- 你们的变更必须先 research 再 proposal
- 你们希望某些项目跳过 design 或 specs
- 你们需要合规、安全、迁移类专用 artifact

## 8. 验证与归档建议

## 8.1 归档前尽量跑一次 `verify`

虽然 `verify` 不强制阻塞归档，但它很适合发现：

- tasks 已勾选，但代码没完全实现
- spec 写了，但没有测试或没有实现证据
- design 里写了 A，代码里做成了 B

## 8.2 不要把 archive 当成纯文件移动

归档的真正意义是：

- 主 specs 更新为新的权威基准
- 本次 change 的背景被沉淀
- 下一个 change 能站在更新后的规范上继续工作

## 8.3 长周期变更可先 `sync`

适用场景：

- 多个并行 change 依赖同一 domain spec
- 变更周期长，不想一直只在 delta specs 里演化
- 想先把已经稳定的规范更新进主 specs

## 9. 与 AI 协作时的提示建议

## 9.1 给 AI 的描述要尽量具体

推荐包含：

- 目标
- 边界
- 非目标
- 限制条件
- 验收标准

例如不要只说：

- “加一个暗黑模式”

更好的是：

- “为 Web 端增加暗黑模式，支持手动切换和系统偏好检测，本次不做自定义主题，不改 Native 端”

## 9.2 不要把所有细节都塞进一条 prompt

更好的做法是：

- 用 `proposal/specs/design/tasks` 承载结构化信息
- 让 AI 分阶段读取这些信息后执行

这比在一次对话里不断堆上下文更稳定。

## 9.3 保持上下文卫生

官方建议高推理模型和干净上下文。实践上也成立：

- 大变更前清理会话上下文
- 不要在一个会话里长期混跑多个无关 change
- 并行变更时，显式传入 change 名

## 10. 常见反模式

## 10.1 为了“显得规范”而写很多内容

问题：

- 文档很多，但没有提高可执行性
- AI 仍然抓不住关键边界

正确做法：

- 少写废话，多写边界、场景、约束

## 10.2 Specs 写成技术设计文档

问题：

- 一旦实现方式变化，spec 就跟着过时

正确做法：

- spec 写行为
- design 写实现

## 10.3 一个 change 里混入多个不相关目标

问题：

- PR 很难审
- 验证很难做
- 归档后主 specs 变得混乱

正确做法：

- 每个 change 只做一个逻辑闭环

## 10.4 跳过 verify，直接 archive

问题：

- 主 specs 可能被同步成一个与真实实现不一致的状态

正确做法：

- 重要 change 至少跑一次 `verify`

## 10.5 一开始就设计非常复杂的 schema

问题：

- 团队还没形成稳定使用习惯，先引入复杂流程只会增加阻力

正确做法：

- 先用默认 schema
- 先优化配置
- 最后再定制 schema

## 11. 渐进式落地方案

## 11.1 第一阶段：试点

目标：跑通一个完整闭环。

建议：

1. 选择一个中小功能
2. 使用 `core` profile
3. 只要求 proposal、specs、tasks 足够清楚
4. 完成后 archive

衡量标准：

- AI 是否明显更少跑偏
- 评审是否更容易
- 后续是否更容易回顾变更原因

## 11.2 第二阶段：规范化

目标：让团队成员开始稳定使用。

建议：

1. 增加 `config.yaml`
2. 约定 change 命名规则
3. 约定 spec domain 划分
4. 归档前增加 `verify`

## 11.3 第三阶段：深度集成

目标：让 OpenSpec 成为团队默认协作方式的一部分。

建议：

1. 启用扩展 workflow
2. 对高风险项目自定义 schema
3. 把 change 与 PR、评审、测试流程结合
4. 对长期并行变更引入 `sync` / `bulk-archive`

## 12. 推荐团队约定

可以直接采用以下约定：

### 12.1 命名约定

- change 名统一 kebab-case
- 动词开头：`add-`、`fix-`、`remove-`、`refactor-`、`optimize-`

### 12.2 归档前检查项

- `proposal.md` 是否写清范围和非目标
- `specs/` 是否覆盖主场景与异常场景
- `design.md` 是否记录关键决策
- `tasks.md` 是否已完成
- `verify` 是否通过或至少已审阅 warning

### 12.3 哪些变更必须写 design

建议以下情况必须保留 `design.md`：

- 涉及架构变化
- 涉及安全、权限、认证
- 涉及数据迁移
- 涉及对外 API 或协议修改
- 涉及跨模块联动

## 13. 最终建议

如果你要把 OpenSpec 用好，最关键的不是“把所有命令都学会”，而是这几条：

1. 先让 AI 和人对齐在同一份 change 上，而不是靠聊天记忆
2. spec 写行为，design 写方案，tasks 写执行
3. 一个 change 只做一个逻辑闭环
4. 先用默认流程跑顺，再自定义 schema
5. 重要变更在 archive 前做 verify

一句话总结：

**OpenSpec 最有效的落地方式，不是把它当流程工具，而是把它当成“让 AI 稳定理解意图并让团队协作可追溯”的最小工程化基础设施。**
