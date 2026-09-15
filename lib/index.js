// DSH 数据源连接器管理器 —— 宿主半边
// 职责：启动自愈（注册表→cordis.yml 受管区块）+ HTTP API（列表/开关/增删改）+ 兜底面板
import { existsSync, readFileSync, copyFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { homedir } from "node:os"
import { defaultRegistryPath, loadRegistry, saveRegistry, sanitizeSource, upsertManagedBlock, upsertManagedPatch, findUnmanaged, atomicWrite, pruneBackups, BACKUP_KEEP } from "./registry.js"

export const name = "mcp-manager"
export const inject = ["webServer"]

// 动态探测当前 profile 目录：常规安装下 4 级向上即 profile；link/开发安装则扫描 DSH 主目录下含我们的 profile
function resolveProfileDir() {
  const self = dirname(fileURLToPath(import.meta.url))
  const up4 = join(self, "..", "..", "..", "..")
  if (existsSync(join(up4, "cordis.yml")) || existsSync(join(up4, "cordis.patch.yml"))) return up4
  const home = process.env.DSH_HOME && process.env.DSH_HOME.trim() !== "" ? process.env.DSH_HOME : join(homedir(), ".dsh")
  const profiles = join(home, "profiles")
  if (existsSync(profiles)) {
    for (const name of readdirSync(profiles)) {
      if (existsSync(join(profiles, name, "node_modules", "@lihua", "dsh-mcp-manager"))) return join(profiles, name)
    }
  }
  return ""
}

function resolvePaths(config) {
  config = config || {}
  const profileDir = resolveProfileDir()
  const cordisPath = config.cordisPath || process.env.DSH_CORDIS_PATH || (profileDir ? join(profileDir, "cordis.yml") : "")
  return {
    registryPath: config.registryPath || defaultRegistryPath(),
    cordisPath: cordisPath,
    patchPath: config.patchPath || (profileDir ? join(profileDir, "cordis.patch.yml") : ""),
    mirrorPath: config.mirrorPath || ""
  }
}

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" })
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise(function (resolve) {
    let body = ""
    req.on("data", function (c) { body += c })
    req.on("end", function () { resolve(body) })
  })
}

export function apply(ctx, config) {
  const paths = resolvePaths(config)
  const disposers = []

  function syncNow() {
    const registry = loadRegistry(paths.registryPath)
    const target = paths.patchPath || paths.cordisPath
    if (!target) throw new Error("缺少 cordisPath 配置")
    const current = existsSync(target) ? readFileSync(target, "utf8") : ""
    const result = (target.endsWith("patch.yml") ? upsertManagedPatch(current, registry) : upsertManagedBlock(current, registry))
    if (result.changed) atomicWrite(target, result.text)
    return registry
  }

  // 只读启动：仅确保注册表存在；绝不自动写 patch（避免与 DSH 物化竞争导致重复块/崩溃）
  let bootWarning = ""
  try {
    if (!existsSync(paths.registryPath)) saveRegistry(paths.registryPath, { sources: [] }, paths.mirrorPath)
    // 启动只读体检：检测补丁重复（只提示，不自动改）
    const target = paths.patchPath || paths.cordisPath
    if (target && existsSync(target)) {
      const ids = []
      for (const line of readFileSync(target, "utf8").split("\n")) {
        const t = line.trim()
        if (t.startsWith("- id:")) {
          const id = t.slice(5).trim().replace(/^["']+|["']+$/g, "")
          if (id.startsWith("mcp-")) ids.push(id)
        }
      }
      const dup = ids.filter(function (v, i) { return ids.indexOf(v) !== i })
      if (dup.length) bootWarning = "检测到补丁重复条目: " + dup[0] + " —— 请在连接器面板点「应用配置」修复"
    }
    try {
      const pr = pruneBackups(target, BACKUP_KEEP)
      if (pr.removed > 0 || pr.redacted > 0) {
        ctx.logger?.info?.("[mcp-manager] 备份收敛：删除 " + pr.removed + " 个、脱敏 " + pr.redacted + " 个，保留 " + pr.kept + " 个")
      }
    } catch (e) { /* 收敛失败不影响启动 */ }
    ctx.logger?.info?.("[mcp-manager] 启动完成（只读模式）" + (bootWarning ? "，警告: " + bootWarning : ""))
  } catch (e) {
    ctx.logger?.error?.("[mcp-manager] 注册表初始化失败: " + String(e && e.message))
  }

  function verifyPatchFile(target) {
    try {
      const ids = []
      for (const line of readFileSync(target, "utf8").split("\n")) {
        const t = line.trim()
        if (t.startsWith("- id:")) {
          const id = t.slice(5).trim().replace(/^["']+|["']+$/g, "")
          if (id.startsWith("mcp-")) ids.push(id)
        }
      }
      const seen = {}
      for (const id of ids) {
        if (seen[id]) return { ok: false, reason: "重复 id: " + id }
        seen[id] = true
      }
      return { ok: true }
    } catch (e) { return { ok: false, reason: String(e && e.message) } }
  }

  function writePatchSafely() {
    const registry = loadRegistry(paths.registryPath)
    const target = paths.patchPath || paths.cordisPath
    if (!target) throw new Error("缺少 patchPath/cordisPath 配置")
    const current = existsSync(target) ? readFileSync(target, "utf8") : ""
    const result = upsertManagedPatch(current, registry)
    // v0.2.4：没有变化就不写、也不建备份（旧版无条件备份是备份堆积的直接原因）
    if (!result.changed) return { changed: false, backup: "" }
    const backup = target + ".mcp-bak-" + Date.now()
    if (existsSync(target)) copyFileSync(target, backup)
    atomicWrite(target, result.text)
    const verify = verifyPatchFile(target)
    if (!verify.ok) {
      if (existsSync(backup)) copyFileSync(backup, target)
      throw new Error("补丁自检失败，已自动回滚备份: " + verify.reason)
    }
    const pruned = pruneBackups(target, BACKUP_KEEP)
    return { changed: true, backup: backup, pruned: pruned }
  }

  function handleList(req, res) {
    try {
      const registry = loadRegistry(paths.registryPath)
      const current = existsSync(paths.cordisPath) ? readFileSync(paths.cordisPath, "utf8") : ""
      send(res, 200, { ok: true, sources: registry.sources || [], unmanagedIds: findUnmanaged(current), warning: bootWarning })
    } catch (e) { send(res, 500, { ok: false, error: String(e && e.message) }) }
  }

  async function handleToggle(req, res) {
    try {
      const body = JSON.parse((await readBody(req)) || "{}")
      const registry = loadRegistry(paths.registryPath)
      const source = (registry.sources || []).find(function (s) { return s.id === body.id })
      if (!source) throw new Error("数据源不存在: " + body.id)
      source.enabled = !!body.enabled
      saveRegistry(paths.registryPath, registry, paths.mirrorPath)
      const applied = writePatchSafely()
      send(res, 200, { ok: true, sources: registry.sources || [], applied: applied.changed })
    } catch (e) { send(res, 400, { ok: false, error: String(e && e.message) }) }
  }

  async function handleSave(req, res) {
    try {
      const body = JSON.parse((await readBody(req)) || "{}")
      const source = sanitizeSource(body.source || body)
      const registry = loadRegistry(paths.registryPath)
      const arr = registry.sources || []
      const idx = arr.findIndex(function (s) { return s.id === source.id })
      if (idx === -1) arr.push(source); else arr[idx] = source
      registry.sources = arr
      saveRegistry(paths.registryPath, registry, paths.mirrorPath)
      const applied = writePatchSafely()
      send(res, 200, { ok: true, sources: registry.sources || [], applied: applied.changed })
    } catch (e) { send(res, 400, { ok: false, error: String(e && e.message) }) }
  }

  async function handleDelete(req, res) {
    try {
      const body = JSON.parse((await readBody(req)) || "{}")
      const registry = loadRegistry(paths.registryPath)
      registry.sources = (registry.sources || []).filter(function (s) { return s.id !== body.id })
      saveRegistry(paths.registryPath, registry, paths.mirrorPath)
      const applied = writePatchSafely()
      send(res, 200, { ok: true, sources: registry.sources || [], applied: applied.changed })
    } catch (e) { send(res, 400, { ok: false, error: String(e && e.message) }) }
  }

  function handleApplyPatch(_req, res) {
    try {
      const applied = writePatchSafely()
      send(res, 200, { ok: true, changed: applied.changed, note: "已写补丁；若 DSH 未自动重载，请重启一次" })
    } catch (e) { send(res, 500, { ok: false, error: String(e && e.message) }) }
  }

  function handlePanel(_req, res) {
    const html = [
      "<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><title>MCP 数据源连接器（兜底面板）</title>",
      "<style>body{font-family:system-ui,\"Microsoft YaHei\",sans-serif;background:#0d1117;color:#e6e8eb;max-width:760px;margin:40px auto;padding:0 16px}",
      ".row{display:flex;align-items:center;gap:12px;background:#161b22;border:1px solid #30363d;border-radius:10px;padding:12px 14px;margin-bottom:8px}",
      ".on{color:#56d364}.off{color:#ff8a80}.sw{margin-left:auto;cursor:pointer;color:#58a6ff}.meta{font-size:12px;opacity:.6;margin-top:2px}",
      "button{background:#238636;color:#fff;border:none;border-radius:7px;padding:4px 10px;cursor:pointer}</style></head><body>",
      "<h2>⚖️ 数据源连接器（兜底面板）</h2><p style=\"color:#8b949e\">推荐使用聊天框下方的连接器入口；本页面仅作兜底。</p>",
      "<div id=\"list\">加载中…</div>",
      "<script>",
      "var API='/api/dsh/mcp-manager';",
      "function esc(s){return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}",
      "function toggle(id,en){fetch(API+'/toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,enabled:en})}).then(function(){load()})}",
      "function load(){fetch(API).then(function(r){return r.json()}).then(function(d){var el=document.getElementById('list');el.innerHTML='';var arr=d.sources||[];if(!arr.length){el.innerHTML='<p style=\"color:#8b949e\">暂无数据源——通过聊天框「管理连接器」添加</p>';return}arr.forEach(function(s){var row=document.createElement('div');row.className='row';row.innerHTML='<div><b>'+esc(s.name)+'</b> <span class=\"'+(s.enabled?'on':'off')+'\">'+(s.enabled?'已开启':'已关闭')+'</span><div class=\"meta\">'+esc(s.description||'')+'</div></div><button class=\"sw\" onclick=\"toggle(\''+esc(s.id)+'\','+(!s.enabled)+')\">'+(s.enabled?'关闭':'开启')+'</button>';el.appendChild(row)})}).catch(function(e){document.getElementById('list').textContent='加载失败:'+e})}",
      "load();",
      "</script></body></html>"
    ].join("")
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
    res.end(html)
  }

  const routes = [
    { path: "/api/dsh/mcp-manager", handler: handleList },
    { path: "/api/dsh/mcp-manager/toggle", handler: handleToggle },
    { path: "/api/dsh/mcp-manager/save", handler: handleSave },
    { path: "/api/dsh/mcp-manager/delete", handler: handleDelete },
    { path: "/api/dsh/mcp-manager/apply-patch", handler: handleApplyPatch },
    { path: "/api/dsh/mcp-manager/panel", handler: handlePanel }
  ]
  for (const r of routes) {
    disposers.push(ctx.webServer.register({ kind: "exact", path: r.path, handler: r.handler }))
  }
  ctx.on("dispose", function () {
    for (const fn of disposers) { try { fn() } catch (e) {} }
  })
  ctx.logger?.info?.("[mcp-manager] 路由就绪：兜底面板 /api/dsh/mcp-manager/panel")
}
