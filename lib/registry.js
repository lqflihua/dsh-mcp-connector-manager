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
  const icon = String(input.icon ?? "⚖️").slice(0, 8) || "⚖️"
  const description = sanitizeText(input.description, "描述", 120)
  if (!Array.isArray(input.servers) || input.servers.length === 0) throw new Error("至少需要一个 MCP 服务条目")
  const seen = new Set()
  const servers = []
  for (let i = 0; i < input.servers.length; i++) {
    const s = input.servers[i]
    const serverName = String(s.serverName ?? "").trim()
    if (!NAME_OK(serverName)) throw new Error("第 " + (i + 1) + " 条 serverName 不合法（字母/数字/_/-，≤32）")
    if (seen.has(serverName)) continue
    seen.add(serverName)
    const url = String(s.url ?? "").trim()
    if (!url.startsWith("http://") && !url.startsWith("https://")) throw new Error("第 " + (i + 1) + " 条 URL 必须以 http(s):// 开头")
    if (hasBadChar(url)) throw new Error("URL 含非法字符")
    const purpose = sanitizeText(s.purpose || serverName, "用途", 60)
    servers.push({ serverName: serverName, url: url, purpose: purpose })
  }
  if (servers.length === 0) throw new Error("至少需要一个有效的 MCP 服务条目（重复条目已自动合并）")
  let token = String(input.token ?? "").trim()
  if (!token) {
    for (const sv of input.servers) {
      const t = String(sv.token ?? "").trim()
      if (t) { token = t; break }
    }
  }
  if (token.length > 200) throw new Error("Token 过长")
  if (hasBadChar(token)) throw new Error("Token 含非法字符")
  return { id: id, name: name, icon: icon, description: description, token: token, enabled: input.enabled !== false, servers: servers }
}

export function loadRegistry(path) {
  if (!existsSync(path)) return { sources: [] }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8") || "{}")
    if (!Array.isArray(parsed.sources)) return { sources: [] }
    const sources = parsed.sources.map(function (s) {
      const servers = (s.servers || []).map(function (sv) {
        return { serverName: sv.serverName, url: sv.url, purpose: sv.purpose }
      })
      let token = String(s.token ?? "").trim()
      if (!token) {
        for (const sv of s.servers || []) {
          const t = String(sv.token ?? "").trim()
          if (t) { token = t; break }
        }
      }
      return { id: s.id, name: s.name, icon: s.icon, description: s.description, enabled: s.enabled !== false, token: token, servers: servers }
    })
    return { sources: sources }
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
        if (s.token) s.token = String(s.token).slice(0, 8) + "…(脱敏)"
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
      const token = String(source.token || sv.token || "").trim()
      if (token) {
        out.push("    headers:")
        out.push("      Authorization: Bearer " + token)
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
  const meaningful = before.filter(function (l) {
    const t = l.trim()
    return t !== "" && !t.startsWith("#") && t !== "[]"
  })
  const head = meaningful.length === 0 ? [] : before
  const nextLines = head.concat([MARK_START], generateLines(registry), [MARK_END], after)
  const next = nextLines.join("\n") + "\n"
  return { text: next, changed: next !== String(cordisText ?? "") }
}

export function generatePatchLines(registry) {
  const out = ["- insert:"]
  let n = 0
  for (const source of registry.sources || []) {
    for (const sv of source.servers || []) {
      n++
      out.push("    - id: mcp-" + source.id + "-" + n)
      out.push("      name: '@deepseek-ai/dsh-mcp-client'")
      if (source.enabled !== true) out.push("      disabled: true")
      out.push("      config:")
      out.push("        serverName: " + yamlScalar(sv.serverName))
      out.push("        transport: streamable-http")
      out.push("        url: " + yamlScalar(sv.url))
      const token = String(source.token || sv.token || "").trim()
      if (token) {
        out.push("        headers:")
        out.push("          Authorization: " + yamlScalar("Bearer " + token))
      }
    }
  }
  if (n === 0) out.push("    # （暂无已配置的连接器——通过聊天框「管理连接器」添加）")
  return out
}

function normMcpId(line) {
  const t = String(line).trim()
  if (!t.startsWith("- id:")) return null
  const id = t.slice(5).trim().replace(/^["']+|["']+$/g, "")
  return id.startsWith("mcp-") ? id : null
}

export function upsertManagedPatch(patchText, registry) {
  const lines = String(patchText ?? "").split("\n")
  // v5（发布级）：按 id 精确识别（含引号归一化），不依赖标记/块结构（DSH 物化会剥标记、重排版、加引号）
  // - 文件只含我们的条目（id 均以 mcp- 开头，无外来操作/条目）→ 整体重写为注册表生成内容（去重+对齐）
  // - 含外来内容 → 移除我们的条目块（按 id 定位），保留其余，末尾追加生成块
  const generated = generatePatchLines(registry)
  const foreignOp = lines.some(function (l) {
    const t = l.trim()
    return t.startsWith("- ") && !t.startsWith("- insert:") && normMcpId(l) === null
  })
  const foreignId = lines.some(function (l) {
    const t = l.trim()
    return t.startsWith("- id:") && normMcpId(l) === null
  })
  let next
  if (!foreignOp && !foreignId) {
    next = generated.join("\n") + "\n"
  } else {
    // 含外来内容：按块处理（块 = 从 "- insert:" 到下一个 "- insert:" 或结尾）
    // 块内所有 "- id:" 均为 mcp- 者视为我们的块 → 整块移除（连 insert 头）；外来块保留
    const out = []
    let i = 0
    while (i < lines.length) {
      if (lines[i].trim() === "- insert:") {
        const block = [lines[i]]
        let j = i + 1
        while (j < lines.length && lines[j].trim() !== "- insert:") { block.push(lines[j]); j++ }
        let idCount = 0
        let ourIdCount = 0
        for (const bl of block) {
          const t = bl.trim()
          if (t.startsWith("- id:")) { idCount++; if (normMcpId(bl) !== null) ourIdCount++ }
        }
        const oursBlock = idCount > 0 && ourIdCount === idCount
        if (!oursBlock) for (const bl of block) out.push(bl)
        i = j
      } else {
        out.push(lines[i])
        i++
      }
    }
    while (out.length > 0 && out[out.length - 1].trim() === "") out.pop()
    next = out.concat(generated).join("\n") + "\n"
  }
  return { text: next, changed: next !== String(patchText ?? "") }
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
