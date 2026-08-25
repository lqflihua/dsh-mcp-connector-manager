// DSH 数据源连接器管理器 —— 宿主半边
// 职责：启动自愈（注册表→cordis.yml 受管区块）+ HTTP API（列表/开关/增删改）+ 兜底面板
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { defaultRegistryPath, loadRegistry, saveRegistry, sanitizeSource, upsertManagedBlock, findUnmanaged, atomicWrite } from "./registry.js"

export const name = "mcp-manager"
export const inject = ["webServer"]

const selfDir = dirname(fileURLToPath(import.meta.url))
const profileDir = join(selfDir, "..", "..", "..", "..")

function resolvePaths(config) {
  config = config || {}
  return {
    registryPath: config.registryPath || defaultRegistryPath(),
    cordisPath: config.cordisPath || join(profileDir, "cordis.yml"),
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
    const current = existsSync(paths.cordisPath) ? readFileSync(paths.cordisPath, "utf8") : ""
    const result = upsertManagedBlock(current, registry)
    if (result.changed) atomicWrite(paths.cordisPath, result.text)
    return registry
  }

  // 启动自愈（核心价值）：注册表缺失则初始化；受管区块永远从注册表再生成
  try {
    if (!existsSync(paths.registryPath)) saveRegistry(paths.registryPath, { sources: [] }, paths.mirrorPath)
    syncNow()
    ctx.logger?.info?.("[mcp-manager] 启动自愈完成：受管区块已与注册表同步")
  } catch (e) {
    ctx.logger?.error?.("[mcp-manager] 启动自愈失败: " + String(e && e.message))
  }

  function handleList(req, res) {
    try {
      const registry = loadRegistry(paths.registryPath)
      const current = existsSync(paths.cordisPath) ? readFileSync(paths.cordisPath, "utf8") : ""
      send(res, 200, { ok: true, sources: registry.sources || [], unmanagedIds: findUnmanaged(current) })
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
      syncNow()
      send(res, 200, { ok: true, sources: registry.sources || [] })
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
      syncNow()
      send(res, 200, { ok: true, sources: registry.sources || [] })
    } catch (e) { send(res, 400, { ok: false, error: String(e && e.message) }) }
  }

  async function handleDelete(req, res) {
    try {
      const body = JSON.parse((await readBody(req)) || "{}")
      const registry = loadRegistry(paths.registryPath)
      registry.sources = (registry.sources || []).filter(function (s) { return s.id !== body.id })
      saveRegistry(paths.registryPath, registry, paths.mirrorPath)
      syncNow()
      send(res, 200, { ok: true, sources: registry.sources || [] })
    } catch (e) { send(res, 400, { ok: false, error: String(e && e.message) }) }
  }

  function handlePanel(_req, res) {
    const html = [
      "<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><title>MCP 数据源连接器（兜底面板）</title>",
      "<style>body{font-family:system-ui,\"Microsoft YaHei\",sans-serif;background:#0d1117;color:#e6e8eb;max-width:760px;margin:40px auto;padding:0 16px}",
      ".row{display:flex;align-items:center;gap:12px;background:#161b22;border:1px solid #30363d;border-radius:10px;padding:12px 14px;margin-bottom:8px}",
      ".on{color:#56d364}.off{color:#ff8a80}.sw{margin-left:auto;cursor:pointer;color:#58a6ff}.meta{font-size:12px;opacity:.6;margin-top:2px}",
      "button{background:#238636;color:#fff;border:none;border-radius:7px;padding:4px 10px;cursor:pointer}</style></head><body>",
      "<h2>🔌 数据源连接器（兜底面板）</h2><p style=\"color:#8b949e\">推荐使用聊天框下方的连接器入口；本页面仅作兜底。</p>",
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
