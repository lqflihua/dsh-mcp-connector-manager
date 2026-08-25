# @lihua/dsh-mcp-manager

DeepSeek Harness（DSH）数据源连接器管理器插件：**入口嵌入聊天框**（输入区左侧工具位，logo 叠放按钮），点开气泡菜单即可查看/开关 MCP 数据源；「管理连接器」对话框支持自定义添加/编辑/删除/配置导入。所有修改 HMR 热生效，无需重启。

![平台](https://img.shields.io/badge/platform-DSH_Desktop-blue) ![协议](https://img.shields.io/badge/license-MIT-green) ![版本](https://img.shields.io/badge/version-0.2.2-orange)

## ✨ 功能

- **聊天框内嵌入口**：输入区左侧工具位常驻 logo 叠放按钮（随启用数据源动态变化）
- **气泡菜单**：每个数据源一行（图标 + 名称 + 状态徽标 + 总开关），一个开关控制该源下全部子服务
- **管理连接器对话框**：
  - 数据源列表（编辑 / 删除）
  - ＋ 添加数据源（名称 / 图标 emoji / 描述 / 多条 MCP 服务条目：serverName · URL · Token · 用途）
  - **📥 从配置导入**：粘贴 mcp.json 格式或 cordis.yml 备份格式，或直接选文件，一键解析
- **启动自愈**：`sources.json` 是唯一事实源；每次启动从注册表自动再生成 cordis.yml 受管区块——配置文件被删/损坏都能自愈
- **兜底面板**：`/api/dsh/mcp-manager/panel`（聊天框入口异常时的备用网页）
- **可拖动**：管理对话框按住标题栏即可拖动，位置在列表/表单切换后保持
- **关闭交互**：✕ / 点击遮罩 / Esc / 再点按钮，四种方式

## 📦 安装

### 方式一：CLI（推荐）

```bash
dsh plugin --profile <你的profile名> add <本仓库路径或git地址>
```

> Windows 路径正斜杠/反斜杠均可；`<本仓库绝对路径>` 指本仓库克隆后的目录。
> CLI 会读取 `package.json` 的 `dsh.bundle.patch` 自动注册宿主实例，并按 `dsh.client.inject` 加载聊天框客户端。

### 方式二：手动

1. 将本仓库复制到 `{DSH主目录}/profiles/{profile名}/node_modules/@lihua/dsh-mcp-manager`
2. 在 `{DSH主目录}/profiles/{profile名}/cordis.patch.yml` 追加：

```yaml
- insert:
    - id: mcp-manager
      name: '@lihua/dsh-mcp-manager'
```

3. 重启 DSH 一次（仅首次安装需要）

## 🚀 使用

1. 重启后，聊天输入框左下角出现 **logo 叠放按钮**
2. 点击 → 气泡菜单：每个数据源一行（图标 + 名称 + 状态 + 总开关）
3. 底部「↗ 管理连接器」→ 添加 / 编辑 / 删除数据源，支持 **📥 从配置导入**（粘贴 mcp.json 或 cordis.yml 备份）
4. 所有修改 **即时生效**（HMR），无需重启

## 🏗️ 架构

```
聊天框（conversation.input.left 插槽，React）
   │ fetch 同源
   ▼
宿主插件（node）：
   GET  /api/dsh/mcp-manager        连接列表
   POST /api/dsh/mcp-manager/toggle 开关（整块注释 cordis.yml，原子写入）
   POST /api/dsh/mcp-manager/save   添加/编辑数据源
   POST /api/dsh/mcp-manager/delete 删除数据源
        ▼
cordis.yml 受管区块（# --- mcp-manager managed ---）
        ▼ HMR 热重载
@deepseek-ai/dsh-mcp-client 实例 → MCP 数据源
```

- **单一事实源**：`~/.dsh/mcp-manager/sources.json`（定义 + 状态 + Token）
- **cordis.yml 受管区块为生成物**，请勿手改；区块外内容永不触碰
- **启动自愈**：受管区块每次启动从注册表再生成——配置被删/损坏自动恢复
- **工作区镜像（可选）**：默认关闭；通过 config.mirrorPath 开启后，注册表每次保存自动镜像到指定目录（Token 脱敏）

## 🔒 安全说明

- Token 本机明文仅存于：`sources.json` 与 cordis.yml 生成物（MCP 连接所必需，物理约束）
- 工作区镜像（可选，默认关闭，可通过 config.mirrorPath 开启）已脱敏（Token 仅留前 8 位占位）
- 生成器白名单输出六个字段，**禁用 js 表达式注入**；用户输入经消毒（拒换行/反引号/模板插值/反斜杠，URL 限 http(s)）
- 请勿把含 Token 的 `sources.json` / `cordis.yml` 提交到任何仓库或云端

## 🔧 开发

本仓库 `lib/` 即手写产物（纯 ESM，无构建步骤）。修改后重启 DSH 即生效。

## 📄 License

[MIT](LICENSE)

## ⚠️ 重要机制（务必先读）

- 本插件**不自动写盘**：启动为只读模式，绝不修改 cordis.patch.yml（避免与 DSH 补丁物化竞争导致重复块/崩溃）。
- 开关/增删改只更新注册表（sources.json）；点「应用配置到 DSH」才写入补丁，且**写前自动备份 + 写后自检（重复 id 检测）+ 异常自动回滚**。
- DSH 会物化重写补丁文件（剥注释、重排版、值加引号）：插件按 **id 精确识别**自己的条目（含引号归一化），不依赖任何标记注释。
- 写入格式：顶层 `- insert:` 操作包装，name 必须加引号（YAML @ 为保留字符）。

## 🔧 官方安装命令（跨机器通用）

```bash
dsh plugin --profile <你的profile名> add <本仓库路径或git地址>
```

插件会在运行时自动探测你的 profile 目录（无需手填任何路径）；如需覆盖，可设环境变量 `DSH_CORDIS_PATH`。
