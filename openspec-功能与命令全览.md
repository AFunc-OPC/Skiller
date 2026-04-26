# OpenSpec 功能与命令全览

基于以下资料整理：

- 中文站点：`https://openspec.radebit.com/`
- 官方仓库：`Fission-AI/OpenSpec`
- 官方文档：`docs/commands.md`、`docs/cli.md`、`docs/workflows.md`、`docs/customization.md`、`docs/supported-tools.md`、`docs/concepts.md`

说明：

- 本文目标是把 OpenSpec 提供的主要功能、工作流能力、Slash 命令、CLI 命令、配置能力和工具支持一次性列全。
- 文档内容会随 OpenSpec 版本演进而变化，本文以当前抓取到的公开文档为准。

## 1. OpenSpec 是什么

OpenSpec 是一个面向 AI 编码助手的规范驱动开发系统。它在代码实现前增加一层轻量规范层，帮助人和 AI 先对齐需求、方案、验收与任务，再进入实现。

核心哲学：

- fluid not rigid：流动而非僵化
- iterative not waterfall：迭代而非瀑布
- easy not complex：简单而非复杂
- brownfield-first：存量项目优先

## 2. OpenSpec 提供的核心功能

### 2.1 规范驱动开发能力

- 用 `openspec/specs/` 维护系统当前行为的权威基准
- 用 `openspec/changes/` 管理每一个独立变更
- 用 Delta Specs 描述新增、修改、删除的行为，而不是重写整份规范
- 将提案、规范、设计、任务拆分为结构化产物，便于 AI 理解和执行

### 2.2 完整变更生命周期能力

- 创建变更
- 生成规划产物
- 按任务实现代码
- 校验实现是否符合规范
- 将 Delta Specs 合并回主规范
- 归档已完成变更

### 2.3 面向 AI 工具的集成能力

- 为多种 AI 工具生成 Skills
- 为多种 AI 工具生成 Slash/Prompt/Workflow 命令文件
- 支持不同工作流 profile
- 支持初始化后更新工具指令文件

### 2.4 自定义能力

- 项目级配置 `openspec/config.yaml`
- 自定义 workflow schema
- 自定义 artifact 模板
- 用户级与项目级 schema 覆盖

### 2.5 管理与验证能力

- 查看变更和规范
- 校验变更与规范结构
- 查看 artifact 进度
- 输出 JSON 供 agent / script 使用
- Shell completion
- 遥测开关

## 3. 目录结构

典型目录：

```text
openspec/
├── specs/              # 主规范，系统当前行为的权威基准
├── changes/            # 所有变更
│   ├── <change-name>/
│   │   ├── proposal.md
│   │   ├── design.md
│   │   ├── tasks.md
│   │   ├── .openspec.yaml
│   │   └── specs/
│   └── archive/
├── schemas/            # 项目级自定义 schema
└── config.yaml         # 项目级配置
```

## 4. 核心概念

### 4.1 Specs

- 描述系统当前行为
- 按 domain 组织，例如 `auth/`、`payments/`、`ui/`
- 由 Requirement 和 Scenario 组成

### 4.2 Changes

- 每个 change 是一个独立目录
- 包含 proposal、design、tasks、delta specs
- 支持并行推进多个 change

### 4.3 Artifacts

标准产物流：

```text
proposal -> specs -> design -> tasks -> implement
```

标准产物：

- `proposal.md`：为什么做、做什么
- `specs/`：行为要求和验收场景
- `design.md`：技术方案与设计决策
- `tasks.md`：实现任务清单

### 4.4 Delta Specs

支持以下变更类型：

- `ADDED Requirements`
- `MODIFIED Requirements`
- `REMOVED Requirements`

### 4.5 Schemas

- 定义 artifact 类型
- 定义 artifact 依赖关系
- 定义 apply 阶段依赖什么产物
- 支持内置 schema 与自定义 schema

### 4.6 Archive

- 将变更对应的 delta specs 合并回 `openspec/specs/`
- 将 change 移动到 `openspec/changes/archive/YYYY-MM-DD-<name>/`
- 保留所有历史产物，用于审计与回溯

## 5. 工作流模式

### 5.1 默认快速路径：`core` profile

默认包含：

- `/opsx:propose`
- `/opsx:explore`
- `/opsx:apply`
- `/opsx:archive`

典型流程：

```text
/opsx:propose -> /opsx:apply -> /opsx:archive
```

### 5.2 扩展工作流

扩展命令：

- `/opsx:new`
- `/opsx:continue`
- `/opsx:ff`
- `/opsx:verify`
- `/opsx:sync`
- `/opsx:bulk-archive`
- `/opsx:onboard`

启用方式：

```bash
openspec config profile
openspec update
```

### 5.3 常见模式

快速功能开发：

```text
/opsx:new -> /opsx:ff -> /opsx:apply -> /opsx:verify -> /opsx:archive
```

探索式开发：

```text
/opsx:explore -> /opsx:new -> /opsx:continue -> /opsx:apply
```

并行变更：

- 多个 change 并行创建与实现
- 最终用 `/opsx:bulk-archive` 统一归档

## 6. 所有 Slash 命令

## 6.1 默认 Quick Path 命令

| 命令 | 作用 |
| --- | --- |
| `/opsx:propose` | 一步创建 change 并生成规划产物 |
| `/opsx:explore` | 先探索问题、需求、方案 |
| `/opsx:apply` | 按任务清单实现变更 |
| `/opsx:archive` | 归档已完成 change |

## 6.2 扩展工作流命令

| 命令 | 作用 |
| --- | --- |
| `/opsx:new` | 创建新的 change scaffold |
| `/opsx:continue` | 按依赖创建下一个 artifact |
| `/opsx:ff` | 一次性生成全部规划产物 |
| `/opsx:verify` | 校验实现是否符合产物定义 |
| `/opsx:sync` | 将 delta specs 合并到主 specs |
| `/opsx:bulk-archive` | 一次归档多个 change |
| `/opsx:onboard` | 用真实代码库走一遍完整教学流程 |

## 6.3 每个 Slash 命令的详细说明

### `/opsx:propose`

语法：

```text
/opsx:propose [change-name-or-description]
```

功能：

- 创建 `openspec/changes/<change-name>/`
- 一步生成实现前需要的全部规划产物
- 默认适合从需求直接进入可实现状态

### `/opsx:explore`

语法：

```text
/opsx:explore [topic]
```

功能：

- 先做探索性讨论
- 调研代码库
- 比较技术方案
- 不强制生成任何 artifact
- 可在结论稳定后切换到 `propose` 或 `new`

### `/opsx:new`

语法：

```text
/opsx:new [change-name] [--schema <schema-name>]
```

功能：

- 创建新的 change 目录
- 创建 `.openspec.yaml`
- 只做 scaffold，不直接生成全部产物

### `/opsx:continue`

语法：

```text
/opsx:continue [change-name]
```

功能：

- 根据 artifact 依赖图创建下一个可生成的产物
- 适合一步一步审阅产物内容

### `/opsx:ff`

语法：

```text
/opsx:ff [change-name]
```

功能：

- 按依赖顺序一次性生成全部规划产物
- 适合需求明确、希望快速推进的场景

### `/opsx:apply`

语法：

```text
/opsx:apply [change-name]
```

功能：

- 读取 `tasks.md`
- 按 task 逐项实现代码
- 完成后勾选任务
- 可中断后继续

### `/opsx:verify`

语法：

```text
/opsx:verify [change-name]
```

功能：

- 校验实现与 artifacts 是否一致
- 从三方面验证：
  - Completeness
  - Correctness
  - Coherence
- 输出 `CRITICAL`、`WARNING`、`SUGGESTION` 级别问题

### `/opsx:sync`

语法：

```text
/opsx:sync [change-name]
```

功能：

- 把 delta specs 合并进主 specs
- 不归档 change
- 适合长期 change 或并行 change 需要共享主规范时手动执行

### `/opsx:archive`

语法：

```text
/opsx:archive [change-name]
```

功能：

- 检查产物完整度
- 检查 task 完成度
- 如未 sync，会提示同步 delta specs
- 归档 change 到 archive 目录

### `/opsx:bulk-archive`

语法：

```text
/opsx:bulk-archive [change-names...]
```

功能：

- 一次归档多个已完成 change
- 检测 spec 冲突
- 通过检查实际实现来辅助冲突处理
- 按时间顺序归档

### `/opsx:onboard`

语法：

```text
/opsx:onboard
```

功能：

- 用真实代码库做教学式 onboarding
- 依次经历：分析代码库、选题、建 change、写 proposal、写 specs、写 design、写 tasks、apply、verify、archive

## 6.4 不同 AI 工具里的命令形式

| 工具 | 形式 |
| --- | --- |
| Claude Code | `/opsx:propose`、`/opsx:apply` |
| Cursor | `/opsx-propose`、`/opsx-apply` |
| Windsurf | `/opsx-propose`、`/opsx-apply` |
| GitHub Copilot IDE | `/opsx-propose`、`/opsx-apply` |
| Trae | `/openspec-propose`、`/openspec-apply-change` 等 skill 风格调用 |

## 6.5 旧版 Legacy 命令

| 命令 | 作用 |
| --- | --- |
| `/openspec:proposal` | 一次性创建 proposal、specs、design、tasks |
| `/openspec:apply` | 实现变更 |
| `/openspec:archive` | 归档变更 |

## 7. CLI 命令总览

OpenSpec CLI 主命令：

```bash
openspec <command>
```

命令分类：

- Setup：`init`、`update`
- Browsing：`list`、`view`、`show`
- Validation：`validate`
- Lifecycle：`archive`
- Workflow：`status`、`instructions`、`templates`、`schemas`
- Schema：`schema init`、`schema fork`、`schema validate`、`schema which`
- Config：`config`
- Utility：`feedback`、`completion`

## 7.1 全局选项

| 选项 | 含义 |
| --- | --- |
| `--version`, `-V` | 显示版本号 |
| `--no-color` | 禁用颜色输出 |
| `--help`, `-h` | 查看帮助 |

## 7.2 Setup 命令

### `openspec init`

语法：

```bash
openspec init [path] [options]
```

作用：

- 初始化项目中的 OpenSpec 目录结构
- 配置 AI 工具集成
- 生成 skills / commands 文件

参数：

- `path`：目标目录，可省略

选项：

| 选项 | 含义 |
| --- | --- |
| `--tools <list>` | 非交互配置工具，支持 `all`、`none` 或逗号分隔列表 |
| `--force` | 自动清理旧版遗留文件 |
| `--profile <profile>` | 覆盖本次初始化使用的 profile，支持 `core` 或 `custom` |

支持的工具 ID：

- `amazon-q`
- `antigravity`
- `auggie`
- `claude`
- `cline`
- `codex`
- `codebuddy`
- `continue`
- `costrict`
- `crush`
- `cursor`
- `factory`
- `gemini`
- `github-copilot`
- `iflow`
- `kilocode`
- `kiro`
- `opencode`
- `pi`
- `qoder`
- `qwen`
- `roocode`
- `trae`
- `windsurf`

### `openspec update`

语法：

```bash
openspec update [path] [options]
```

作用：

- 升级 CLI 后，重新生成当前项目中的工具指令文件
- 使最新 workflow/profile 生效

选项：

| 选项 | 含义 |
| --- | --- |
| `--force` | 即使已是最新，也强制刷新 |

## 7.3 Browsing 命令

### `openspec list`

语法：

```bash
openspec list [options]
```

作用：

- 列出 changes 或 specs

选项：

| 选项 | 含义 |
| --- | --- |
| `--specs` | 列出 specs |
| `--changes` | 列出 changes，默认 |
| `--sort <order>` | `recent` 或 `name` |
| `--json` | JSON 输出 |

### `openspec view`

语法：

```bash
openspec view
```

作用：

- 打开终端内交互式 dashboard 浏览 specs 与 changes

### `openspec show`

语法：

```bash
openspec show [item-name] [options]
```

作用：

- 展示具体 change 或 spec 详情

通用选项：

| 选项 | 含义 |
| --- | --- |
| `--type <type>` | 指定 `change` 或 `spec` |
| `--json` | JSON 输出 |
| `--no-interactive` | 禁止交互提示 |

change 专属：

| 选项 | 含义 |
| --- | --- |
| `--deltas-only` | 仅显示 delta specs，仅 JSON 模式 |

spec 专属：

| 选项 | 含义 |
| --- | --- |
| `--requirements` | 只显示 requirement，不含 scenario |
| `--no-scenarios` | 不显示 scenario |
| `-r, --requirement <id>` | 只显示某个 requirement |

## 7.4 Validation 命令

### `openspec validate`

语法：

```bash
openspec validate [item-name] [options]
```

作用：

- 校验 change 或 spec 的结构正确性

选项：

| 选项 | 含义 |
| --- | --- |
| `--all` | 校验全部 changes 和 specs |
| `--changes` | 校验全部 changes |
| `--specs` | 校验全部 specs |
| `--type <type>` | 指定 `change` 或 `spec` |
| `--strict` | 严格模式 |
| `--json` | JSON 输出 |
| `--concurrency <n>` | 并发数，默认 6 |
| `--no-interactive` | 禁止交互提示 |

## 7.5 Lifecycle 命令

### `openspec archive`

语法：

```bash
openspec archive [change-name] [options]
```

作用：

- 归档已完成 change
- 将 delta specs 合并回主 specs

选项：

| 选项 | 含义 |
| --- | --- |
| `-y, --yes` | 跳过确认 |
| `--skip-specs` | 跳过 spec 更新，适合纯基础设施/文档/工具变更 |
| `--no-validate` | 跳过验证 |

## 7.6 Workflow 命令

### `openspec status`

语法：

```bash
openspec status [options]
```

作用：

- 查看某个 change 的 artifact 完成状态

选项：

| 选项 | 含义 |
| --- | --- |
| `--change <id>` | 指定 change 名 |
| `--schema <name>` | 覆盖 schema |
| `--json` | JSON 输出 |

### `openspec instructions`

语法：

```bash
openspec instructions [artifact] [options]
```

作用：

- 输出某个 artifact 或 apply 阶段的增强指令
- 供 AI agent 或人工理解下一步该如何创建产物

说明：

- `artifact` 可为 `proposal`、`specs`、`design`、`tasks`、`apply`

选项：

| 选项 | 含义 |
| --- | --- |
| `--change <id>` | 指定 change |
| `--schema <name>` | 覆盖 schema |
| `--json` | JSON 输出 |

### `openspec templates`

语法：

```bash
openspec templates [options]
```

作用：

- 查看当前 schema 下各 artifact 的模板路径

选项：

| 选项 | 含义 |
| --- | --- |
| `--schema <name>` | 指定 schema |
| `--json` | JSON 输出 |

### `openspec schemas`

语法：

```bash
openspec schemas [options]
```

作用：

- 列出可用 workflow schema
- 展示其描述与 artifact 流程

选项：

| 选项 | 含义 |
| --- | --- |
| `--json` | JSON 输出 |

## 7.7 Schema 命令

### `openspec schema init`

语法：

```bash
openspec schema init <name> [options]
```

作用：

- 创建新的项目级 schema

选项：

| 选项 | 含义 |
| --- | --- |
| `--description <text>` | schema 描述 |
| `--artifacts <list>` | 逗号分隔 artifact 列表，默认 `proposal,specs,design,tasks` |
| `--default` | 设为项目默认 schema |
| `--no-default` | 不提示设置为默认 |
| `--force` | 覆盖同名 schema |
| `--json` | JSON 输出 |

### `openspec schema fork`

语法：

```bash
openspec schema fork <source> [name] [options]
```

作用：

- 复制现有 schema 到当前项目，以便自定义修改

选项：

| 选项 | 含义 |
| --- | --- |
| `--force` | 覆盖目标 schema |
| `--json` | JSON 输出 |

### `openspec schema validate`

语法：

```bash
openspec schema validate [name] [options]
```

作用：

- 校验 schema 结构与模板是否正确

选项：

| 选项 | 含义 |
| --- | --- |
| `--verbose` | 输出详细验证过程 |
| `--json` | JSON 输出 |

### `openspec schema which`

语法：

```bash
openspec schema which [name] [options]
```

作用：

- 查看某个 schema 实际从哪里解析而来
- 用于排查覆盖优先级问题

选项：

| 选项 | 含义 |
| --- | --- |
| `--all` | 列出全部 schema 及来源 |
| `--json` | JSON 输出 |

schema 优先级：

1. 项目级：`openspec/schemas/<name>/`
2. 用户级：`~/.local/share/openspec/schemas/<name>/`
3. 包内置 schema

## 7.8 Config 命令

### `openspec config`

语法：

```bash
openspec config <subcommand> [options]
```

子命令：

| 子命令 | 作用 |
| --- | --- |
| `path` | 显示配置文件路径 |
| `list` | 列出所有配置 |
| `get <key>` | 读取某项配置 |
| `set <key> <value>` | 设置某项配置 |
| `unset <key>` | 删除某项配置 |
| `reset` | 恢复默认配置 |
| `edit` | 用编辑器打开配置 |
| `profile [preset]` | 交互配置 workflow profile |

`openspec config profile` 可做的事：

- 修改 delivery 与 workflows
- 只修改 delivery
- 只修改 workflows
- 保持当前设置并退出

支持的 profile / preset：

- `core`
- `custom`

## 7.9 Utility 命令

### `openspec feedback`

语法：

```bash
openspec feedback <message> [options]
```

作用：

- 通过 GitHub issue 提交反馈

选项：

| 选项 | 含义 |
| --- | --- |
| `--body <text>` | 补充详细描述 |

依赖：

- 已安装并登录 `gh`

### `openspec completion`

语法：

```bash
openspec completion <subcommand> [shell]
```

子命令：

| 子命令 | 作用 |
| --- | --- |
| `generate [shell]` | 输出 completion 脚本到 stdout |
| `install [shell]` | 安装 shell completion |
| `uninstall [shell]` | 卸载 shell completion |

支持 shell：

- `bash`
- `zsh`
- `fish`
- `powershell`

## 8. 人用命令 vs Agent 兼容命令

### 8.1 主要面向人工交互的 CLI 命令

- `openspec init`
- `openspec view`
- `openspec config edit`
- `openspec feedback`
- `openspec completion install`

### 8.2 支持 `--json` 的 agent / script 友好命令

- `openspec list`
- `openspec show`
- `openspec validate`
- `openspec status`
- `openspec instructions`
- `openspec templates`
- `openspec schemas`

## 9. 环境变量

| 环境变量 | 作用 |
| --- | --- |
| `OPENSPEC_TELEMETRY` | 设为 `0` 时关闭遥测 |
| `DO_NOT_TRACK` | 设为 `1` 时关闭遥测 |
| `OPENSPEC_CONCURRENCY` | 批量验证默认并发数 |
| `EDITOR` / `VISUAL` | `openspec config edit` 使用的编辑器 |
| `NO_COLOR` | 禁用彩色输出 |

## 10. 遥测

OpenSpec 会收集匿名使用统计，用于了解命令使用模式。

文档说明不会收集：

- 参数
- 路径
- 内容
- 个人身份信息

关闭方式：

```bash
export OPENSPEC_TELEMETRY=0
export DO_NOT_TRACK=1
```

## 11. 自定义配置能力

## 11.1 项目配置文件

文件：`openspec/config.yaml`

可配置：

- 默认 schema
- 项目上下文 `context`
- 按 artifact 注入规则 `rules`

示例：

```yaml
schema: spec-driven

context: |
  Tech stack: TypeScript, React, Node.js, PostgreSQL
  API style: RESTful
  Testing: Jest + React Testing Library

rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
  specs:
    - Use Given/When/Then format
    - Reference existing patterns before inventing new ones
```

schema 解析顺序：

1. CLI 参数 `--schema <name>`
2. change 内 `.openspec.yaml`
3. 项目配置 `openspec/config.yaml`
4. 默认 `spec-driven`

## 11.2 自定义 Schema 能力

你可以：

- 从零创建 schema
- fork 内置 schema 再修改
- 自定义 artifact 列表
- 自定义 artifact 依赖关系
- 自定义每个 artifact 的模板与 instruction

示例 schema：

```yaml
name: my-workflow
version: 1
description: My team's custom workflow

artifacts:
  - id: proposal
    generates: proposal.md
    template: proposal.md
    requires: []

  - id: design
    generates: design.md
    template: design.md
    requires:
      - proposal

  - id: tasks
    generates: tasks.md
    template: tasks.md
    requires:
      - design

apply:
  requires: [tasks]
  tracks: tasks.md
```

## 12. 支持的工具

说明：

- `openspec init` 时会根据选择的工具生成 skills 与 commands
- 是否生成 skills / commands 取决于 delivery 模式和 selected workflows
- 默认 `core` 只生成 `propose`、`explore`、`apply`、`archive` 相关内容

## 12.1 所有支持的工具与路径模式

| 工具（ID） | Skills 路径模式 | Commands 路径模式 |
| --- | --- | --- |
| Amazon Q Developer (`amazon-q`) | `.amazonq/skills/openspec-*/SKILL.md` | `.amazonq/prompts/opsx-<id>.md` |
| Antigravity (`antigravity`) | `.agent/skills/openspec-*/SKILL.md` | `.agent/workflows/opsx-<id>.md` |
| Auggie (`auggie`) | `.augment/skills/openspec-*/SKILL.md` | `.augment/commands/opsx-<id>.md` |
| IBM Bob Shell (`bob`) | `.bob/skills/openspec-*/SKILL.md` | `.bob/commands/opsx-<id>.md` |
| Claude Code (`claude`) | `.claude/skills/openspec-*/SKILL.md` | `.claude/commands/opsx/<id>.md` |
| Cline (`cline`) | `.cline/skills/openspec-*/SKILL.md` | `.clinerules/workflows/opsx-<id>.md` |
| CodeBuddy (`codebuddy`) | `.codebuddy/skills/openspec-*/SKILL.md` | `.codebuddy/commands/opsx/<id>.md` |
| Codex (`codex`) | `.codex/skills/openspec-*/SKILL.md` | `$CODEX_HOME/prompts/opsx-<id>.md` |
| ForgeCode (`forgecode`) | `.forge/skills/openspec-*/SKILL.md` | 不生成命令文件，使用 skill 调用 |
| Continue (`continue`) | `.continue/skills/openspec-*/SKILL.md` | `.continue/prompts/opsx-<id>.prompt` |
| CoStrict (`costrict`) | `.cospec/skills/openspec-*/SKILL.md` | `.cospec/openspec/commands/opsx-<id>.md` |
| Crush (`crush`) | `.crush/skills/openspec-*/SKILL.md` | `.crush/commands/opsx/<id>.md` |
| Cursor (`cursor`) | `.cursor/skills/openspec-*/SKILL.md` | `.cursor/commands/opsx-<id>.md` |
| Factory Droid (`factory`) | `.factory/skills/openspec-*/SKILL.md` | `.factory/commands/opsx-<id>.md` |
| Gemini CLI (`gemini`) | `.gemini/skills/openspec-*/SKILL.md` | `.gemini/commands/opsx/<id>.toml` |
| GitHub Copilot (`github-copilot`) | `.github/skills/openspec-*/SKILL.md` | `.github/prompts/opsx-<id>.prompt.md` |
| iFlow (`iflow`) | `.iflow/skills/openspec-*/SKILL.md` | `.iflow/commands/opsx-<id>.md` |
| Junie (`junie`) | `.junie/skills/openspec-*/SKILL.md` | `.junie/commands/opsx-<id>.md` |
| Kilo Code (`kilocode`) | `.kilocode/skills/openspec-*/SKILL.md` | `.kilocode/workflows/opsx-<id>.md` |
| Kiro (`kiro`) | `.kiro/skills/openspec-*/SKILL.md` | `.kiro/prompts/opsx-<id>.prompt.md` |
| OpenCode (`opencode`) | `.opencode/skills/openspec-*/SKILL.md` | `.opencode/commands/opsx-<id>.md` |
| Pi (`pi`) | `.pi/skills/openspec-*/SKILL.md` | `.pi/prompts/opsx-<id>.md` |
| Qoder (`qoder`) | `.qoder/skills/openspec-*/SKILL.md` | `.qoder/commands/opsx/<id>.md` |
| Qwen Code (`qwen`) | `.qwen/skills/openspec-*/SKILL.md` | `.qwen/commands/opsx-<id>.toml` |
| RooCode (`roocode`) | `.roo/skills/openspec-*/SKILL.md` | `.roo/commands/opsx-<id>.md` |
| Trae (`trae`) | `.trae/skills/openspec-*/SKILL.md` | 不生成命令文件，使用 skill 调用 |
| Windsurf (`windsurf`) | `.windsurf/skills/openspec-*/SKILL.md` | `.windsurf/workflows/opsx-<id>.md` |

补充：

- Codex 命令安装在全局 Codex Home，而不是项目目录
- GitHub Copilot 的 `.github/prompts/*.prompt.md` 仅适用于 IDE 扩展，不适用于 Copilot CLI

## 12.2 `--tools` 可用的工具 ID

- `amazon-q`
- `antigravity`
- `auggie`
- `bob`
- `claude`
- `cline`
- `codex`
- `codebuddy`
- `continue`
- `costrict`
- `crush`
- `cursor`
- `factory`
- `forgecode`
- `gemini`
- `github-copilot`
- `iflow`
- `junie`
- `kilocode`
- `kiro`
- `opencode`
- `pi`
- `qoder`
- `qwen`
- `roocode`
- `trae`
- `windsurf`

## 12.3 根据 workflow 生成的 skill 名称

- `openspec-propose`
- `openspec-explore`
- `openspec-new-change`
- `openspec-continue-change`
- `openspec-apply-change`
- `openspec-ff-change`
- `openspec-sync-specs`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-verify-change`
- `openspec-onboard`

## 12.4 可选 workflow ID 全列表

- `propose`
- `explore`
- `new`
- `continue`
- `apply`
- `ff`
- `sync`
- `archive`
- `bulk-archive`
- `verify`
- `onboard`

## 13. 安装方式

要求：

- Node.js `20.19.0` 或更高版本

安装方式：

```bash
npm install -g @fission-ai/openspec@latest
```

```bash
pnpm add -g @fission-ai/openspec@latest
```

```bash
yarn global add @fission-ai/openspec@latest
```

```bash
bun add -g @fission-ai/openspec@latest
```

```bash
nix run github:Fission-AI/OpenSpec -- init
```

```bash
nix profile install github:Fission-AI/OpenSpec
```

验证安装：

```bash
openspec --version
```

## 14. 最常见的使用流程

### 14.1 快速上手

```bash
openspec init
```

然后在 AI 对话里：

```text
/opsx:propose add-dark-mode
/opsx:apply
/opsx:archive
```

### 14.2 启用扩展工作流

```bash
openspec config profile
openspec update
```

然后可使用：

```text
/opsx:new
/opsx:continue
/opsx:ff
/opsx:verify
/opsx:sync
/opsx:bulk-archive
/opsx:onboard
```

## 15. 常见排障点

文档里明确给出的典型问题：

- Change not found
- No artifacts ready
- Schema not found
- Commands not recognized
- Artifacts not generating properly

常见排查动作：

- 明确传入 change 名
- 用 `openspec list` 检查 change 是否存在
- 用 `openspec status --change <name>` 看阻塞点
- 用 `openspec schemas` 检查 schema 是否存在
- 执行 `openspec update` 重新生成工具指令

## 16. 一句话总结

如果只用一句话概括 OpenSpec 的全部能力：

**它提供了一整套从“探索需求 -> 生成规范与设计 -> 按任务实现 -> 校验 -> 同步规范 -> 归档沉淀” 的 AI 原生规范驱动开发工作流，并通过 CLI、Slash 命令、Schema、自定义配置和多工具集成把这套流程落地。**
