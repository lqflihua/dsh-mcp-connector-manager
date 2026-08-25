// MCP 连接器管理器 —— 注册表/消毒/受管区块生成（纯逻辑，无框架依赖）
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { homedir } from "node:os"

export const MARK_START = "# --- mcp-manager managed (auto-generated; do not edit) ---"
export const MARK_END = "# --- end mcp-manager managed ---"

export function defaultRegistryPath() {
  const home = process.env.DSH_HOME && process.env.DSH_HOME.trim() !== "" ? process.env.DSH_HOME : join(homedir(), ".dsh")
  return join(home, "mcp-manager", "sources.json")
}

const NAME_OK = function (s) { return /^[A-Za-z0-9_-]{1,32}$/.test(s) }
const ID_OK = function (s) { return /^[a-z][a-z0-9_-]{0,40}$/.test(s) }
function hasBadChar(s) {
  const arr = String(s).split("")
  for (const ch of arr) {
    const c = ch.charCodeAt(0)
    if (c === 10 || c === 13 || c === 92) return true
  }
  return s.includes("`") || s.includes("$" + "{")
}

export function sanitizeText(value, field, max) {
  const s = String(value ?? "").trim()
  const limit = max || 200
  if (!s) throw new Error(field + " 不能为空")
  if (s.length > limit) throw new Error(field + " 过长")
  if (hasBadChar(s)) throw new Error(field + " 含非法字符")
  return s
}

export function sanitizeSource(input) {
  const id = String(input.id ?? "").trim()
  if (!ID_OK(id)) throw new Error("数据源 id 不合法（小写字母开头，仅小写字母/数字/_/-）")
  const name = sanitizeText(input.name, "名称", 60)
  const icon = String(input.icon ?? "🔌").slice(0, 8) || "🔌"
  const description = sanitizeText(input.description, "描述", 120)
  if (!Array.isArray(input.servers) || input.servers.length === 0) throw new Error("至少需要一个 MCP 服务条目")
  const servers = input.servers.map(function (s, i) {
    const serverName = String(s.serverName ?? "").trim()
    if (!NAME_OK(serverName)) throw new Error("第 " + (i + 1) + " 条 serverName 不合法（字母/数字/_/-，≤32）")
    const url = String(s.url ?? "").trim()
    if (!url.startsWith("http://") && !url.startsWith("https://")) throw new Error("第 " + (i + 1) + " 条 URL 必须以 http(s):// 开头")
    if (hasBadChar(url)) throw new Error("URL 含非法字符")
    const token = String(s.token ?? "").trim()
    if (hasBadChar(token)) throw new Error("Token 含非法字符")
    const purpose = sanitizeText(s.purpose || serverName, "用途", 60)
    const out = { serverName: serverName, url: url, purpose: purpose }
    if (token) out.token = token
    return out
  })
  return { id: id, name: name, icon: icon, description: description, enabled: input.enabled !== false, servers: servers }
}

export function loadRegistry(path) {
  if (!existsSync(path)) return { sources: [] }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8") || "{}")
    if (!Array.isArray(parsed.sources)) return { sources: [] }
    return parsed
  } catch (e) { return { sources: [] } }
}

export function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true })
  const tmp = path + ".tmp"
  writeFileSync(tmp, content, "utf8")
  renameSync(tmp, path)
}

export function saveRegistry(path, registry, mirrorPath) {
  atomicWrite(path, JSON.stringify(registry, null, 2) + "\n")
  if (mirrorPath) {
    try {
      const clone = JSON.parse(JSON.stringify(registry))
      const sources = clone.sources || []
      for (const s of sources) {
        const servers = s.servers || []
        for (const sv of servers) if (sv.token) sv.token = String(sv.token).slice(0, 8) + "…(脱敏)"
      }
      atomicWrite(mirrorPath, JSON.stringify(clone, null, 2) + "\n")
    } catch (e) { /* 镜像失败不阻塞主流程 */ }
  }
}

function yamlScalar(s) {
  const v = String(s)
  return /^[A-Za-z0-9./:@+-]+$/.test(v) ? v : JSON.stringify(v)
}

export function generateLines(registry) {
  const out = []
  let n = 0
  const sources = registry.sources || []
  for (const source of sources) {
    const servers = source.servers || []
    for (const sv of servers) {
      n++
      out.push("- id: mcp-" + source.id + "-" + n)
      out.push("  name: '@deepseek-ai/dsh-mcp-client'")
      if (source.enabled !== true) out.push("  disabled: true")
      out.push("  config:")
      out.push("    serverName: " + yamlScalar(sv.serverName))
      out.push("    transport: streamable-http")
      out.push("    url: " + yamlScalar(sv.url))
      if (sv.token) {
        out.push("    headers:")
        out.push("      Authorization: Bearer " + sv.token)
      }
    }
  }
  if (n === 0) out.push("# （暂无已配置的连接器——通过聊天框「管理连接器」添加）")
  return out
}

export function upsertManagedBlock(cordisText, registry) {
  const lines = String(cordisText ?? "").split("\n")
  const startIdx = lines.findIndex(function (l) { return l.trim() === MARK_START })
  let endIdx = -1
  if (startIdx !== -1) {
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() === MARK_END) { endIdx = i; break }
    }
  }
  const before = startIdx !== -1 ? lines.slice(0, startIdx) : lines.slice(0)
  const after = (startIdx !== -1 && endIdx !== -1) ? lines.slice(endIdx + 1) : []
  while (before.length > 0 && before[before.length - 1].trim() === "") before.pop()
  while (after.length > 0 && after[after.length - 1].trim() === "") after.pop()
  const headText = before.join("\n").trim()
  const head = (headText === "" || headText === "[]") ? [] : before
  const nextLines = head.concat([MARK_START], generateLines(registry), [MARK_END], after)
  const next = nextLines.join("\n") + "\n"
  return { text: next, changed: next !== String(cordisText ?? "") }
}

export function findUnmanaged(cordisText) {
  const lines = String(cordisText ?? "").split("\n")
  const ids = []
  let inManaged = false
  for (const line of lines) {
    const t = line.trim()
    if (t === MARK_START) { inManaged = true; continue }
    if (t === MARK_END) { inManaged = false; continue }
    if (inManaged) continue
    if (t.startsWith("- id: ")) {
      const id = t.slice(6).split(" ")[0]
      if (id.startsWith("mcp-")) ids.push(id)
    }
  }
  return ids
}
