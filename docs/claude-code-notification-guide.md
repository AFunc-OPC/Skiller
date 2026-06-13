# Claude Code 任务完成通知配置指南

> 适用环境：Windows 11 / WSL / VS Code / 原生终端
> 更新日期：2026-06-12

---

## 背景

使用 Claude Code 执行长任务时（构建、测试、代码生成等），你需要反复切回终端查看是否完成。配置通知后，可以安心做其他事情，任务结束或需要你操作时会自动提醒。

---

## 方案一：Terminal Bell（官方内置，推荐首选）

### 一行命令开启

```bash
claude config set --global preferredNotifChannel terminal_bell
```

- **即时生效**，无需重启 Claude Code
- 任务完成时发出系统铃声
- 需要你输入（权限确认等）时也会响铃

### 各环境注意事项

| 环境 | 是否生效 | 备注 |
|------|---------|------|
| Windows PowerShell | ✅ 通常直接生效 | — |
| Windows CMD | ✅ 通常直接生效 | — |
| Git Bash | ✅ 通常直接生效 | — |
| VS Code 终端 | ⚠️ 需检查设置 | 确认 `terminal.integrated.enableBell` 已开启 |
| WSL | ❌ 可能不响 | 见方案二的替代指令 |
| JetBrains 终端 | ⚠️ 视配置而定 | 检查终端铃声设置 |

### 关闭通知

```bash
claude config set --global preferredNotifChannel none
```

---

## 方案二：CLAUDE.md 自定义提醒指令（Terminal Bell 不响时的兜底）

在项目根目录的 `CLAUDE.md` 或全局 `~/.claude/CLAUDE.md` 中添加：

```markdown
## 通知规则

任务完成或需要我手工操作（权限确认、选择方案、回答问题）时，
执行以下命令提醒我：

powershell.exe -Command "[System.Console]::Beep(800, 200)"
```

### 可选：自定义提示音

```bash
# 短促一声（默认）
powershell.exe -Command "[System.Console]::Beep(800, 200)"

# 两声短促
powershell.exe -Command "[System.Console]::Beep(800, 200); Start-Sleep -Milliseconds 100; [System.Console]::Beep(1000, 200)"

# 系统提示音（Exclamation 类型）
powershell.exe -Command "[System.Media.SystemSounds]::Exclamation.Play()"

# 系统提示音（Asterisk 类型，更柔和）
powershell.exe -Command "[System.Media.SystemSounds]::Asterisk.Play()"
```

### Windows 系统通知弹窗（视觉效果更好）

如果希望看到系统级弹窗通知：

```markdown
## 通知规则

任务完成时执行：
powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Claude Code 任务已完成', 'Claude Code', 'OK', 'Information')"

需要我操作时执行：
powershell.exe -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Claude Code 需要你的输入', 'Claude Code', 'OK', 'Warning')"
```

> ⚠️ MessageBox 会阻塞 Claude Code 直到点击确认，适合不介意手动关弹窗的场景。

---

## 方案三：VS Code 扩展 — Claude Notifier（功能最全）

如果你在 **VS Code** 中使用 Claude Code，安装扩展获得最佳体验：

- **扩展名称：** [Claude Notifier](https://marketplace.visualstudio.com/items?itemName=SingularityInc.claude-notifier)
- **安装命令：** `code --install-extension SingularityInc.claude-notifier`

### 功能特性

| 功能 | 说明 |
|------|------|
| 声音通知 | 任务完成、需要权限、提出问题时各用不同音效 |
| 系统弹窗 | Windows 原生通知 |
| 状态栏控制面板 | 悬停 Claude 状态栏图标，可调音量、预览音效、切换预设 |
| 最小任务时长阈值 | 短任务不通知，避免频繁打扰 |

### 版本信息

当前版本 3.3.0，支持状态栏悬停控制面板。

---

## 方案四：Hooks 自动化通知（高级）

通过 Claude Code 的 Hooks 机制，在特定事件触发时执行自定义脚本：

在 `.claude/settings.json` 中配置：

```json
{
  "hooks": {
    "Stop": [
      {
        "type": "command",
        "command": "powershell.exe -Command \"[System.Console]::Beep(800, 200)\""
      }
    ],
    "Notification": [
      {
        "type": "command",
        "command": "powershell.exe -Command \"[System.Console]::Beep(600, 300)\""
      }
    ]
  }
}
```

> **说明：** `Stop` 在 Claude Code 停止/完成时触发；`Notification` 在需要用户关注时触发。

---

## 快速决策流程

```
你在哪个环境使用 Claude Code？
│
├─ VS Code → 先试方案一，再考虑方案三（Claude Notifier）
│
├─ Windows 原生终端 → 方案一（一行命令搞定）
│
├─ WSL → 方案二（CLAUDE.md + PowerShell Beep）
│
└─ JetBrains / 其他 → 方案一，不响则用方案二
```

---

## 验证通知是否工作

配置完成后，可以用以下方式测试：

1. **测试终端铃声：** 在终端直接执行 `echo -e "\a"` 或 `powershell.exe -Command "[System.Console]::Beep(800, 200)"`
2. **测试 Claude Code 通知：** 给 Claude 一个简单任务（如"在终端输出 hello"），完成后应听到提示音

---

## 参考资料

- [Anthropic 官方文档 - Terminal Bell Notifications](https://docs.anthropic.com/en/docs/claude-code/settings#terminal-bell-notifications)
- [VelvetShark - Claude Code Sound Notification](https://velvetshark.com/til/claude-code-sound-notification)
- [Reddit - Claude Code Terminal Bell Notifications 讨论](https://www.reddit.com/r/ClaudeAI/comments/1kpt4za/claude_code_terminal_bell_notifications)
- [Claude Notifier - VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SingularityInc.claude-notifier)
