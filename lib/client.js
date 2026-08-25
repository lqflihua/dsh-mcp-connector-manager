window.__ModuleLoader__.load({
  id: "@lihua/dsh-mcp-manager",
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    var React = require("react")

    var API = "/api/dsh/mcp-manager"
    var styleDone = false

    function ensureStyles() {
      if (styleDone) return
      styleDone = true
      var st = document.createElement("style")
      st.textContent = [
        ".mcpmgr-wrap{position:relative;display:inline-flex;font-family:system-ui,sans-serif;align-items:center}",
        ".mcpmgr-stack{display:inline-flex;align-items:center;padding:2px;cursor:pointer;background:transparent;border:none}",
        ".mcpmgr-stack:hover .mcpmgr-logo{border-color:#238636}",
        ".mcpmgr-logo{width:20px;height:20px;border-radius:50%;background:#1c2129;display:inline-flex;align-items:center;justify-content:center;font-size:11px;border:1.5px solid #0d1117}",
        ".mcpmgr-plug{background:#238636}",
        ".mcpmgr-arrow{font-size:10px;color:#56d364;margin-left:5px}",
        ".mcpmgr-pop{position:absolute;bottom:calc(100% + 10px);left:0;width:340px;background:#161b22;border:1px solid #30363d;border-radius:14px;box-shadow:0 14px 38px rgba(0,0,0,.6);padding:10px;z-index:90;text-align:left}",
        ".mcpmgr-pop-head{display:flex;justify-content:space-between;align-items:center;padding:2px 4px 6px}",
        ".mcpmgr-pop-title{font-size:13px;font-weight:700}",
        ".mcpmgr-refresh{font-size:11px;color:#58a6ff;cursor:pointer;border:1px solid rgba(31,111,235,.35);border-radius:7px;padding:2px 8px}",
        ".mcpmgr-close{font-size:12px;color:#8b949e;cursor:pointer;margin-left:8px}",
        ".mcpmgr-close:hover{color:#e6e8eb}",
        ".mcpmgr-pop-count{font-size:11px;color:#8b949e;padding:0 4px 8px}",
        ".mcpmgr-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:#131a21;border:1px solid #21262d;margin-bottom:6px}",
        ".mcpmgr-grow{flex:1;min-width:0}",
        ".mcpmgr-name{font-size:13px;font-weight:600}",
        ".mcpmgr-desc{font-size:11px;color:#8b949e;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
        ".mcpmgr-badge{font-size:10px;padding:2px 7px;border-radius:999px;flex:none}",
        ".mcpmgr-on{background:#12301f;color:#56d364}",
        ".mcpmgr-off{background:#3a1716;color:#ff8a80}",
        ".mcpmgr-sw{width:38px;height:21px;border-radius:999px;background:#484f58;position:relative;cursor:pointer;flex:none}",
        ".mcpmgr-sw-on{background:#238636}",
        ".mcpmgr-sw::after{content:'';position:absolute;width:15px;height:15px;top:3px;background:#fff;border-radius:50%}",
        ".mcpmgr-sw-on::after{right:3px}",
        ".mcpmgr-sw-off::after{left:3px}",
        ".mcpmgr-divider{height:1px;background:#21262d;margin:6px 8px}",
        ".mcpmgr-mgmt{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer}",
        ".mcpmgr-mgmt:hover{background:#1c2129}",
        ".mcpmgr-mgmt-arrow{color:#8b949e;font-size:12px}",
        ".mcpmgr-empty{padding:14px;color:#8b949e;font-size:12px;text-align:center}",
        ".mcpmgr-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#1f2328;color:#fff;padding:9px 16px;border-radius:8px;font-size:12px;z-index:1001;max-width:80vw}",
        ".mcpmgr-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:36px 16px;overflow:visible}",
        ".mcpmgr-modal{position:relative;width:640px;max-width:92vw;background:#161b22;border:1px solid #30363d;border-radius:14px;padding:18px}",
        ".mcpmgr-modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:move;user-select:none}",
        ".mcpmgr-modal .mcpmgr-close{font-size:14px}",
        ".mcpmgr-label{display:block;font-size:12px;color:#8b949e;margin:10px 0 4px}",
        ".mcpmgr-input{width:100%;box-sizing:border-box;background:#0d1117;border:1px solid #30363d;border-radius:8px;color:#e6e8eb;padding:7px 10px;font-size:12px}",
        ".mcpmgr-btn{background:#238636;color:#fff;border:none;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:12px}",
        ".mcpmgr-btn2{background:#21262d;color:#e6e8eb;border:1px solid #30363d;border-radius:8px;padding:7px 14px;cursor:pointer;font-size:12px;margin-right:8px}",
        ".mcpmgr-del{color:#ff8a80;cursor:pointer;font-size:12px}",
        ".mcpmgr-err{color:#ff8a80;font-size:12px;margin-top:10px;min-height:14px}",
        ".mcpmgr-srv{border:1px solid #21262d;border-radius:10px;padding:10px;margin-bottom:8px}"
      ].join("")
      document.head.appendChild(st)
    }

    function h(type, props) {
      var children = Array.prototype.slice.call(arguments, 2)
      return React.createElement.apply(React, [type, props || {}].concat(children))
    }
    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
      })
    }
    function fetchJSON(url, opts) {
      return fetch(url, opts || { credentials: "same-origin" }).then(function (r) { return r.json() })
    }

    function openManagerDialog(onChanged, requestClose) {
      var root = document.createElement("div")
      root.className = "mcpmgr-overlay"
      var registry = { sources: [] }
      var draft = null
      var editId = null
      var modalPos = null

      function load() {
        return fetchJSON(API).then(function (d) {
          if (!d.ok) throw new Error(d.error || "加载失败")
          registry = { sources: d.sources || [] }
        })
      }

      function close() {
        if (root.parentNode) root.parentNode.removeChild(root)
        requestClose()
      }
      function modalHtml(inner) {
        return '<div class="mcpmgr-modal"><div class="mcpmgr-modal-head"><div class="mcpmgr-pop-title">管理连接器</div><span class="mcpmgr-close" data-act="close" title="关闭">✕</span></div>' + inner + '</div>'
      }
      function renderList() {
        var sources = registry.sources || []
        var rows = sources.map(function (s) {
          return '<div class="mcpmgr-row"><span class="mcpmgr-logo">' + esc(s.icon || "🔌") + '</span><div class="mcpmgr-grow"><div class="mcpmgr-name">' + esc(s.name) + '</div><div class="mcpmgr-desc">' + esc(s.description || "") + ' · ' + ((s.servers || []).length) + ' 个子服务</div></div><span class="mcpmgr-btn2" data-act="edit" data-id="' + esc(s.id) + '">编辑</span><span class="mcpmgr-del" data-act="del" data-id="' + esc(s.id) + '">删除</span></div>'
        }).join("")
        if (!rows) rows = '<div class="mcpmgr-empty">还没有数据源，点「＋ 添加数据源」开始配置</div>'
        root.innerHTML = modalHtml('<button class="mcpmgr-btn" data-act="new">＋ 添加数据源</button><button class="mcpmgr-btn2" data-act="import" style="margin-left:8px">📥 从配置导入</button><div style="height:10px"></div>' + rows)
        applyModalChrome()
      }
      function renderForm() {
        var svRows = (draft.servers || []).map(function (sv, i) {
          return '<div class="mcpmgr-srv"><label class="mcpmgr-label">serverName</label><input class="mcpmgr-input" data-f="serverName" data-i="' + i + '" value="' + esc(sv.serverName) + '"><label class="mcpmgr-label">URL</label><input class="mcpmgr-input" data-f="url" data-i="' + i + '" value="' + esc(sv.url) + '"><label class="mcpmgr-label">Token（可留空）</label><input class="mcpmgr-input" data-f="token" data-i="' + i + '" value="' + esc(sv.token || "") + '"><label class="mcpmgr-label">用途</label><input class="mcpmgr-input" data-f="purpose" data-i="' + i + '" value="' + esc(sv.purpose || "") + '">' + ((draft.servers || []).length > 1 ? '<div style="margin-top:6px"><span class="mcpmgr-del" data-act="rmsrv" data-i="' + i + '">移除该服务</span></div>' : "") + '</div>'
        }).join("")
        root.innerHTML = modalHtml(
          '<label class="mcpmgr-label">数据源 ID（小写字母开头' + (editId ? "，编辑时不可改" : "") + '）</label><input class="mcpmgr-input" data-f="id" value="' + esc(draft.id) + '"' + (editId ? " disabled" : "") + '>' +
          '<label class="mcpmgr-label">名称</label><input class="mcpmgr-input" data-f="name" value="' + esc(draft.name) + '">' +
          '<label class="mcpmgr-label">图标（emoji）</label><input class="mcpmgr-input" data-f="icon" value="' + esc(draft.icon) + '">' +
          '<label class="mcpmgr-label">描述</label><input class="mcpmgr-input" data-f="desc" value="' + esc(draft.description) + '">' +
          '<div class="mcpmgr-label" style="margin-top:12px">MCP 服务条目</div>' + svRows +
          '<div style="margin-top:10px"><span class="mcpmgr-btn2" data-act="addsrv">＋ 添加服务条目</span></div><div style="margin-top:14px"><button class="mcpmgr-btn" data-act="save">保存</button><button class="mcpmgr-btn2" data-act="back">返回列表</button></div><div class="mcpmgr-err" id="mcpmgr-err"></div>'
        )
        applyModalChrome()
      }
      function renderImport() {
        var inner =
          '<div class="mcpmgr-label">方式一：粘贴配置文本（支持 mcp.json 格式，或 cordis.yml 备份格式）</div>' +
          '<textarea id="mcpmgr-paste" class="mcpmgr-input" style="height:170px;font-family:monospace" placeholder="{&quot;mcpServers&quot;:{...}} 或 - id: mcp-xxx ..."></textarea>' +
          '<div style="margin-top:10px"><label class="mcpmgr-btn2" style="display:inline-block;cursor:pointer">📂 选择配置文件<input type="file" accept=".json,.yaml,.yml,.txt" data-act="importfile" style="display:none"></label></div>' +
          '<div style="margin-top:12px"><button class="mcpmgr-btn" data-act="parseimport">解析并继续</button><button class="mcpmgr-btn2" data-act="back">返回列表</button></div>' +
          '<div class="mcpmgr-err" id="mcpmgr-err"></div>'
        root.innerHTML = modalHtml(inner)
      }
      function parseImportText(text) {
        var t = String(text || "").trim()
        var servers = []
        if (t.charAt(0) === "{") {
          var obj = JSON.parse(t)
          var mcp = obj.mcpServers || obj
          for (var key in mcp) {
            if (!Object.prototype.hasOwnProperty.call(mcp, key)) continue
            var e = mcp[key]
            if (!e || !e.url) continue
            var sv = { serverName: key, url: e.url, purpose: key }
            var hd = e.headers || {}
            var auth = hd.Authorization || hd.authorization || ""
            var bi = auth.indexOf("Bearer ")
            if (bi === 0) sv.token = auth.slice(7)
            servers.push(sv)
          }
          return servers
        }
        var lines = t.split("\n")
        var cur = null
        for (var j = 0; j < lines.length; j++) {
          var tt = lines[j].trim()
          if (tt.indexOf("- id: mcp-") === 0) { if (cur) servers.push(cur); cur = { serverName: tt.slice(6).trim(), url: "", purpose: "" } }
          else if (cur) {
            if (tt.indexOf("serverName:") === 0) cur.serverName = tt.slice(11).trim()
            else if (tt.indexOf("url:") === 0) cur.url = tt.slice(4).trim()
            else if (tt.indexOf("Authorization:") !== -1) { var bi = tt.indexOf("Bearer "); if (bi !== -1) cur.token = tt.slice(bi + 7).trim() }
          }
        }
        if (cur) servers.push(cur)
        return servers
      }
      function collectForm() {
        var inputs = root.querySelectorAll("input[data-f]")
        for (var i = 0; i < inputs.length; i++) {
          var el = inputs[i]
          var f = el.getAttribute("data-f")
          var di = el.getAttribute("data-i")
          if (di === null || di === undefined) { draft[f] = el.value }
          else { var idx = parseInt(di, 10); if (draft.servers[idx]) draft.servers[idx][f] = el.value }
        }
      }
      function findSource(id) {
        var arr = registry.sources || []
        for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]
        return null
      }
      function saveSource() {
        collectForm()
        fetchJSON(API + "/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: draft }) })
          .then(function (d) {
            if (!d.ok) throw new Error(d.error || "保存失败")
            registry = { sources: d.sources || [] }
            onChanged()
            renderList()
          })
          .catch(function (e) { var el = root.querySelector("#mcpmgr-err"); if (el) el.textContent = e.message })
      }
      function deleteSource(id) {
        fetchJSON(API + "/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id }) })
          .then(function (d) { if (!d.ok) throw new Error(d.error || "删除失败"); registry = { sources: d.sources || [] }; onChanged(); renderList() })
          .catch(function (e) { var el = root.querySelector("#mcpmgr-err"); if (el) el.textContent = e.message })
      }

      function applyModalChrome() {
        var modal = root.querySelector(".mcpmgr-modal")
        if (!modal) return
        if (modalPos) {
          modal.style.position = "fixed"
          modal.style.margin = "0"
          modal.style.left = modalPos.left + "px"
          modal.style.top = modalPos.top + "px"
        }
        var head = modal.querySelector(".mcpmgr-modal-head")
        if (!head) return
        head.style.cursor = "move"
        head.onmousedown = function (e) {
          if (e.target.closest && e.target.closest(".mcpmgr-close")) return
          var rect = modal.getBoundingClientRect()
          modalPos = { left: rect.left, top: rect.top }
          modal.style.position = "fixed"
          modal.style.margin = "0"
          modal.style.left = rect.left + "px"
          modal.style.top = rect.top + "px"
          var startX = e.clientX, startY = e.clientY
          function onMove(ev) {
            modalPos.left = rect.left + (ev.clientX - startX)
            modalPos.top = rect.top + (ev.clientY - startY)
            modal.style.left = modalPos.left + "px"
            modal.style.top = modalPos.top + "px"
          }
          function onUp() {
            window.removeEventListener("mousemove", onMove)
            window.removeEventListener("mouseup", onUp)
          }
          window.addEventListener("mousemove", onMove)
          window.addEventListener("mouseup", onUp)
          e.preventDefault()
        }
      }

      root.addEventListener("click", function (e) {
        if (e.target === root) { close(); return }
        var el = e.target.closest ? e.target.closest("[data-act]") : null
        if (!el) return
        var act = el.getAttribute("data-act")
        if (act === "close") { close(); return }
        if (act === "new") { draft = { id: "", name: "", icon: "🔌", description: "", enabled: true, servers: [{ serverName: "", url: "", token: "", purpose: "" }] }; editId = null; renderForm(); return }
        if (act === "import") { renderImport(); return }
        if (act === "parseimport") {
          var ta = root.querySelector("#mcpmgr-paste")
          var parsed = []
          try { parsed = parseImportText(ta ? ta.value : "") } catch (e) { var er = root.querySelector("#mcpmgr-err"); if (er) er.textContent = "解析失败: " + e.message; return }
          if (!parsed.length) { var er2 = root.querySelector("#mcpmgr-err"); if (er2) er2.textContent = "未解析到服务条目"; return }
          draft = { id: "", name: "", icon: "🔌", description: "", enabled: true, servers: parsed }
          renderForm()
          var okEl = root.querySelector("#mcpmgr-err")
          if (okEl) { okEl.style.color = "#56d364"; okEl.textContent = "已解析 " + parsed.length + " 个服务，请补全 ID 和名称后保存" }
          return
        }
        if (act === "edit") { var s = findSource(el.getAttribute("data-id")); if (!s) return; draft = JSON.parse(JSON.stringify(s)); editId = s.id; renderForm(); return }
        if (act === "del") { var did = el.getAttribute("data-id"); if (!window.confirm("确认删除该数据源及其连接器配置？")) return; deleteSource(did); return }
        if (act === "addsrv") { draft.servers.push({ serverName: "", url: "", token: "", purpose: "" }); renderForm(); return }
        if (act === "rmsrv") { draft.servers.splice(parseInt(el.getAttribute("data-i"), 10), 1); renderForm(); return }
        if (act === "save") { saveSource(); return }
        if (act === "back") { renderList(); return }
      })

      root.addEventListener("change", function (e) {
        if (e.target.getAttribute && e.target.getAttribute("data-act") === "importfile" && e.target.files && e.target.files[0]) {
          var reader = new FileReader()
          reader.onload = function () {
            var ta = root.querySelector("#mcpmgr-paste")
            if (ta) ta.value = String(reader.result)
          }
          reader.readAsText(e.target.files[0])
        }
      })
      load().then(renderList).catch(function (e) { root.innerHTML = modalHtml('<div class="mcpmgr-empty">加载失败：' + esc(e.message) + '</div>'); document.body.appendChild(root) })
      document.body.appendChild(root)
    }

    function Popover(props) {
      var sources = props.sources || []
      var rows = []
      if (!sources.length) rows.push(h("div", { className: "mcpmgr-empty", key: "empty" }, "暂无数据源——点击下方「管理连接器」添加"))
      for (var i = 0; i < sources.length; i++) {
        ;(function (s) {
          rows.push(h("div", { className: "mcpmgr-row", key: s.id },
            h("span", { className: "mcpmgr-logo" }, s.icon || "🔌"),
            h("div", { className: "mcpmgr-grow" },
              h("div", { className: "mcpmgr-name" }, s.name),
              h("div", { className: "mcpmgr-desc" }, s.description || "")
            ),
            h("span", { className: "mcpmgr-badge " + (s.enabled ? "mcpmgr-on" : "mcpmgr-off") }, s.enabled ? "已开启" : "已关闭"),
            h("span", { className: "mcpmgr-sw" + (s.enabled ? " mcpmgr-sw-on" : " mcpmgr-sw-off"), title: s.enabled ? "点击关闭" : "点击开启", onClick: function () { props.toggle(s.id, !s.enabled) } })
          ))
        })(sources[i])
      }
      var onCount = sources.filter(function (s) { return s.enabled }).length
      return h("div", { className: "mcpmgr-pop", onClick: function (e) { e.stopPropagation() } },
        h("div", { className: "mcpmgr-pop-head" },
          h("span", { className: "mcpmgr-pop-title" }, "数据源连接器"),
          h("span", null,
            h("span", { className: "mcpmgr-refresh", onClick: props.onRefresh }, "🔄 刷新"),
            h("span", { className: "mcpmgr-close", title: "关闭", onClick: props.onClose }, "✕")
          )
        ),
        h("div", { className: "mcpmgr-pop-count" }, sources.length + " 个数据源 · 开启 " + onCount + " / 关闭 " + (sources.length - onCount) + " · 修改即时生效（HMR）"),
        h("div", null, rows),
        h("div", { className: "mcpmgr-divider" }),
        h("div", { className: "mcpmgr-mgmt", onClick: function () { props.onManage() } },
          h("span", { className: "mcpmgr-mgmt-arrow" }, "↗"),
          h("span", null, "管理连接器")
        )
      )
    }

    function ConnectorApp() {
      var st1 = React.useState(false)
      var open = st1[0], setOpen = st1[1]
      var st2 = React.useState([])
      var sources = st2[0], setSources = st2[1]
      var st3 = React.useState(false)
      var managing = st3[0], setManaging = st3[1]
      var st4 = React.useState("")
      var toastMsg = st4[0], setToast = st4[1]
      var wrapRef = React.useRef(null)

      React.useEffect(function () {
        ensureStyles()
        fetchJSON(API).then(function (d) { if (d.ok) setSources(d.sources || []) }).catch(function () {})
      }, [])

      React.useEffect(function () {
        if (!managing) return
        openManagerDialog(
          function () { refresh() },
          function () { setManaging(false) }
        )
      }, [managing])

      React.useEffect(function () {
        if (!open && !managing) return
        function onDocMouseDown(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
        function onKey(e) { if (e.key === "Escape") { if (managing) setManaging(false); else setOpen(false) } }
        document.addEventListener("mousedown", onDocMouseDown)
        document.addEventListener("keydown", onKey)
        return function () {
          document.removeEventListener("mousedown", onDocMouseDown)
          document.removeEventListener("keydown", onKey)
        }
      }, [open, managing])

      function refresh() {
        fetchJSON(API).then(function (d) { if (d.ok) setSources(d.sources || []) }).catch(function () {})
      }
      function toggle(id, enabled) {
        fetchJSON(API + "/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: id, enabled: enabled }) })
          .then(function (d) {
            if (!d.ok) throw new Error(d.error || "操作失败")
            setSources(d.sources || [])
            toast((enabled ? "✅ 已开启 " : "⛔ 已关闭 ") + id + "（热生效）")
          })
          .catch(function (e) { toast("❌ " + e.message) })
      }
      function toast(msg) { setToast(msg); setTimeout(function () { setToast("") }, 2400) }

      var enabledSources = sources.filter(function (s) { return s.enabled })
      var logos = enabledSources.length
        ? enabledSources.map(function (s, i) { return h("span", { key: s.id, className: "mcpmgr-logo", style: { marginLeft: i === 0 ? "0" : "-7px" } }, s.icon || "🔌") })
        : [h("span", { key: "plug", className: "mcpmgr-logo mcpmgr-plug" }, "🔌")]

      return h("span", { className: "mcpmgr-wrap", ref: wrapRef },
        h("span", { className: "mcpmgr-stack" + (open ? " mcpmgr-stack-open" : ""), title: "数据源连接器", onClick: function () { setOpen(!open) } }, logos),
        open ? h(Popover, { sources: sources, toggle: toggle, onRefresh: refresh, onManage: function () { setManaging(true) }, onClose: function () { setOpen(false) } }) : null,
        toastMsg ? h("div", { className: "mcpmgr-toast" }, toastMsg) : null
      )
    }

    var inject = ["slots"]
    function apply(ctx) {
      ensureStyles()
      try {
        ctx.slots.inject("conversation.input.left", function () {
          return ctx.slots.register({ name: "conversation.input.left", id: "mcp-manager", label: "数据源连接器" }, ConnectorApp)
        })
      } catch (e) { console.error("[mcp-manager] 插槽注册失败:", e) }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
