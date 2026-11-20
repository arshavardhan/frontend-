/* eslint-disable */
// Generated from the backend's DSA judge (dsaHarness, dsaVerdict, codingGenie rules) so the guest preview judges JavaScript exactly like the server.
// dsa/judge/dsaValues.rules.ts
var elementOf = (t) => {
  if (t.endsWith("[]")) return t.slice(0, -2);
  if (t.startsWith("list<")) return t.slice(5, -1).replace(/^list<(.*)>$/, "list<$1>");
  return null;
};
var isArrayType = (t) => elementOf(t) !== null;
var arrayElement = (t) => elementOf(t);
function check(cond, message) {
  if (!cond) throw new Error(message);
}
function encodeValue(type, value, out) {
  switch (type) {
    case "int":
    case "long":
      check(Number.isInteger(value), `${type} expected, got ${JSON.stringify(value)}`);
      out.push(String(value));
      return;
    case "double":
      check(typeof value === "number" && Number.isFinite(value), "double expected");
      out.push(String(value));
      return;
    case "bool":
      check(typeof value === "boolean", "bool expected");
      out.push(value ? "1" : "0");
      return;
    case "char":
      check(typeof value === "string" && value.length === 1, "char expected");
      out.push(String(value.charCodeAt(0)));
      return;
    case "string":
      check(typeof value === "string", "string expected");
      out.push(String(value.length));
      for (let i = 0; i < value.length; i++) out.push(String(value.charCodeAt(i)));
      return;
    case "ListNode":
      encodeValue("int[]", value, out);
      return;
    case "TreeNode": {
      check(Array.isArray(value), "tree expected as level-order array");
      out.push(String(value.length));
      for (const v of value) {
        check(v === null || Number.isInteger(v), "tree values are integers or null");
        out.push(v === null ? "#" : String(v));
      }
      return;
    }
    case "void":
      throw new Error("void has no value");
    default: {
      check(Array.isArray(value), `${type} expected`);
      const el = arrayElement(type);
      out.push(String(value.length));
      for (const v of value) encodeValue(el, v, out);
    }
  }
}
function encodeArgs(params, args) {
  check(args.length === params.length, `expected ${params.length} arguments`);
  const out = [];
  params.forEach((p, i) => encodeValue(p.type, args[i], out));
  return out;
}
function encodeDesignCalls(sig, calls) {
  check(calls.length > 0 && calls[0][0] === sig.className, "first call is the constructor");
  const out = [String(calls.length)];
  calls.forEach(([method, args], i) => {
    if (i === 0) {
      out.push("0");
      out.push(...encodeArgs(sig.constructorParams, args));
      return;
    }
    const index = sig.methods.findIndex((m) => m.name === method);
    check(index >= 0, `unknown method ${method}`);
    out.push(String(index + 1));
    out.push(...encodeArgs(sig.methods[index].params, args));
  });
  return out;
}

// dsa/judge/dsaHarness.rules.ts
var javaType = {
  int: "int",
  long: "long",
  double: "double",
  bool: "boolean",
  string: "String",
  char: "char",
  "int[]": "int[]",
  "long[]": "long[]",
  "double[]": "double[]",
  "bool[]": "boolean[]",
  "string[]": "String[]",
  "char[]": "char[]",
  "int[][]": "int[][]",
  "string[][]": "String[][]",
  "char[][]": "char[][]",
  "list<int>": "List<Integer>",
  "list<string>": "List<String>",
  "list<list<int>>": "List<List<Integer>>",
  "list<list<string>>": "List<List<String>>",
  ListNode: "ListNode",
  TreeNode: "TreeNode",
  void: "void"
};
var javaBox = {
  int: "Integer",
  long: "Long",
  double: "Double",
  bool: "Boolean",
  char: "Character"
};
var cppType = (t) => {
  const scalar = {
    int: "int",
    long: "long long",
    double: "double",
    bool: "bool",
    string: "string",
    char: "char",
    ListNode: "ListNode*",
    TreeNode: "TreeNode*",
    void: "void"
  };
  if (scalar[t]) return scalar[t];
  return `vector<${cppType(arrayElement(t))}>`;
};
var pyType = (t) => {
  const scalar = {
    int: "int",
    long: "int",
    double: "float",
    bool: "bool",
    string: "str",
    char: "str",
    ListNode: "Optional[ListNode]",
    TreeNode: "Optional[TreeNode]",
    void: "None"
  };
  if (scalar[t]) return scalar[t];
  return `List[${pyType(arrayElement(t))}]`;
};
var jsDocType = (t) => {
  if (["int", "long", "double"].includes(t)) return "number";
  if (t === "bool") return "boolean";
  if (t === "string" || t === "char") return "string";
  if (t === "ListNode" || t === "TreeNode") return `${t} | null`;
  if (t === "void") return "void";
  return `${jsDocType(arrayElement(t))}[]`;
};
var cppParam = (p) => isArrayType(p.type) || p.type === "string" ? `${cppType(p.type)}& ${p.name}` : `${cppType(p.type)} ${p.name}`;
var javaDefault = (t) => t === "void" ? "" : ["int", "long", "double", "char"].includes(t) ? " return 0; " : t === "bool" ? " return false; " : " return null; ";
var cppDefault = (t) => t === "void" ? "" : ["int", "long", "double", "char"].includes(t) ? " return 0; " : t === "bool" ? " return false; " : t === "ListNode" || t === "TreeNode" ? " return nullptr; " : " return {}; ";
var usesList = (sig) => JSON.stringify(sig).includes("ListNode") ? "list" : "";
var usesTree = (sig) => JSON.stringify(sig).includes("TreeNode") ? "tree" : "";
var LIST_COMMENT_JS = "/**\n * function ListNode(val, next) { this.val = val ?? 0; this.next = next ?? null; }\n */\n";
var TREE_COMMENT_JS = "/**\n * function TreeNode(val, left, right) { this.val = val ?? 0; this.left = left ?? null; this.right = right ?? null; }\n */\n";
function starterCode(sig, language) {
  const note = (js, other) => language === "javascript" ? js : other;
  const header = [
    usesList(sig) ? note(
      LIST_COMMENT_JS,
      language === "python" ? "# class ListNode:\n#     def __init__(self, val=0, next=None): self.val = val; self.next = next\n" : "// ListNode: int val; ListNode next (C++: ListNode* next)\n"
    ) : "",
    usesTree(sig) ? note(
      TREE_COMMENT_JS,
      language === "python" ? "# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None): ...\n" : "// TreeNode: int val; TreeNode left, right (C++: TreeNode* left, right)\n"
    ) : ""
  ].join("");
  if (sig.kind === "function") {
    const ps = sig.params;
    switch (language) {
      case "javascript":
        return `${header}/**
${ps.map((p) => ` * @param {${jsDocType(p.type)}} ${p.name}`).join("\n")}
 * @return {${jsDocType(sig.returns)}}
 */
function ${sig.name}(${ps.map((p) => p.name).join(", ")}) {
  
}
`;
      case "python":
        return `${header}class Solution:
    def ${sig.name}(self${ps.map((p) => `, ${p.name}: ${pyType(p.type)}`).join("")}) -> ${pyType(sig.returns)}:
        pass
`;
      case "java":
        return `${header}class Solution {
    public ${javaType[sig.returns]} ${sig.name}(${ps.map((p) => `${javaType[p.type]} ${p.name}`).join(", ")}) {
       ${javaDefault(sig.returns)}
    }
}
`;
      case "cpp":
        return `${header}class Solution {
public:
    ${cppType(sig.returns)} ${sig.name}(${ps.map(cppParam).join(", ")}) {
       ${cppDefault(sig.returns)}
    }
};
`;
    }
  }
  const d = sig;
  switch (language) {
    case "javascript":
      return `${header}class ${d.className} {
  constructor(${d.constructorParams.map((p) => p.name).join(", ")}) {
    
  }
${d.methods.map((m) => `
  ${m.name}(${m.params.map((p) => p.name).join(", ")}) {
    
  }
`).join("")}}
`;
    case "python":
      return `${header}class ${d.className}:
    def __init__(self${d.constructorParams.map((p) => `, ${p.name}: ${pyType(p.type)}`).join("")}):
        pass
${d.methods.map((m) => `
    def ${m.name}(self${m.params.map((p) => `, ${p.name}: ${pyType(p.type)}`).join("")}) -> ${pyType(m.returns)}:
        pass
`).join("")}`;
    case "java":
      return `${header}class ${d.className} {
    public ${d.className}(${d.constructorParams.map((p) => `${javaType[p.type]} ${p.name}`).join(", ")}) {
        
    }
${d.methods.map((m) => `
    public ${javaType[m.returns]} ${m.name}(${m.params.map((p) => `${javaType[p.type]} ${p.name}`).join(", ")}) {
       ${javaDefault(m.returns)}
    }
`).join("")}}
`;
    case "cpp":
      return `${header}class ${d.className} {
public:
    ${d.className}(${d.constructorParams.map(cppParam).join(", ")}) {
        
    }
${d.methods.map((m) => `
    ${cppType(m.returns)} ${m.name}(${m.params.map(cppParam).join(", ")}) {
       ${cppDefault(m.returns)}
    }
`).join("")}};
`;
  }
}
var JS_PRELUDE = `function ListNode(val, next) { this.val = val === undefined ? 0 : val; this.next = next === undefined ? null : next; }
function TreeNode(val, left, right) { this.val = val === undefined ? 0 : val; this.left = left === undefined ? null : left; this.right = right === undefined ? null : right; }
`;
var JS_RUNTIME = `
const __tkData = require('fs').readFileSync(0, 'utf8').split(/\\s+/).filter(Boolean); let __tkPos = 0;
const __tkT = () => __tkData[__tkPos++];
function __tkRead(t) {
  if (t === 'int' || t === 'long' || t === 'double') return Number(__tkT());
  if (t === 'bool') return __tkT() === '1';
  if (t === 'char') return String.fromCharCode(Number(__tkT()));
  if (t === 'string') { const n = Number(__tkT()); let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(Number(__tkT())); return s; }
  if (t === 'ListNode') { const v = __tkRead('int[]'); let h = null; for (let i = v.length - 1; i >= 0; i--) h = new ListNode(v[i], h); return h; }
  if (t === 'TreeNode') { const n = Number(__tkT()); const v = []; for (let i = 0; i < n; i++) { const x = __tkT(); v.push(x === '#' ? null : Number(x)); }
    if (!v.length || v[0] === null) return null; const root = new TreeNode(v[0]); const q = [root]; let i = 1;
    for (let k = 0; k < q.length && i < v.length; k++) { const node = q[k]; const l = v[i++]; if (l !== undefined && l !== null) { node.left = new TreeNode(l); q.push(node.left); } const r = v[i++]; if (r !== undefined && r !== null) { node.right = new TreeNode(r); q.push(node.right); } } return root; }
  const el = t.endsWith('[]') ? t.slice(0, -2) : t.slice(5, -1); const n = Number(__tkT()); const a = []; for (let i = 0; i < n; i++) a.push(__tkRead(el)); return a;
}
function __tkSer(t, v) {
  if (t === 'void') return null;
  if (t === 'int' || t === 'long' || t === 'double') return v === undefined || v === null ? null : Number(v);
  if (t === 'bool') return v === undefined || v === null ? null : Boolean(v);
  if (t === 'char' || t === 'string') return v === undefined || v === null ? null : String(v);
  if (t === 'ListNode') { const out = []; for (let n = v; n && out.length < 100000; n = n.next) out.push(n.val); return out; }
  if (t === 'TreeNode') { const out = []; const q = [v]; for (let k = 0; k < q.length && k < 200000; k++) { const n = q[k]; out.push(n ? n.val : null); if (n) q.push(n.left, n.right); } while (out.length && out[out.length - 1] === null) out.pop(); return out; }
  if (v === undefined || v === null) return null;
  const el = t.endsWith('[]') ? t.slice(0, -2) : t.slice(5, -1); return Array.from(v, (x) => __tkSer(el, x));
}
const __tkNonce = __tkT(); const __tkCount = Number(__tkT());
const __tkOut = (i, ok, ms, payload) => process.stdout.write('\\n@@' + __tkNonce + ' ' + i + ' ' + (ok ? 'OK' : 'ERR') + ' ' + ms.toFixed(2) + ' ' + JSON.stringify(payload) + '\\n');
`;
function jsDriver(sig) {
  if (sig.kind === "function") {
    const reads = sig.params.map((p) => `__tkRead(${JSON.stringify(p.type)})`).join(", ");
    const outIndex = sig.outputParam ? sig.params.findIndex((p) => p.name === sig.outputParam) : -1;
    const result = outIndex >= 0 ? `__tkSer(${JSON.stringify(sig.params[outIndex].type)}, __a[${outIndex}])` : `__tkSer(${JSON.stringify(sig.returns)}, __r)`;
    return `${JS_RUNTIME}
for (let __i = 0; __i < __tkCount; __i++) {
  const __a = [${reads}];
  const __s = performance.now();
  try { const __r = ${sig.name}(...__a); const __p = ${result}; __tkOut(__i, true, performance.now() - __s, __p); }
  catch (e) { __tkOut(__i, false, performance.now() - __s, String(e && e.stack ? e.stack.split('\\n').slice(0, 3).join('\\n') : e)); }
}
`;
  }
  const cases = sig.methods.map(
    (m, i) => `      case ${i + 1}: { const a = [${m.params.map((p) => `__tkRead(${JSON.stringify(p.type)})`).join(", ")}]; ops.push(() => res.push(__tkSer(${JSON.stringify(m.returns)}, obj.${m.name}(...a)))); break; }`
  ).join("\n");
  return `${JS_RUNTIME}
for (let __i = 0; __i < __tkCount; __i++) {
  const ops = []; const res = []; let obj = null;
  const n = Number(__tkT());
  for (let k = 0; k < n; k++) {
    const op = Number(__tkT());
    switch (op) {
      case 0: { const a = [${sig.constructorParams.map((p) => `__tkRead(${JSON.stringify(p.type)})`).join(", ")}]; ops.push(() => { obj = new ${sig.className}(...a); res.push(null); }); break; }
${cases}
    }
  }
  const __s = performance.now();
  try { for (const f of ops) f(); __tkOut(__i, true, performance.now() - __s, res); }
  catch (e) { __tkOut(__i, false, performance.now() - __s, String(e && e.stack ? e.stack.split('\\n').slice(0, 3).join('\\n') : e)); }
}
`;
}
var PY_PRELUDE = `import sys, json, time, math, heapq, bisect, itertools, functools, collections, string, random
from typing import *
from collections import *
from functools import lru_cache, cache, reduce
from heapq import heappush, heappop, heapify
from bisect import bisect_left, bisect_right, insort
sys.setrecursionlimit(1 << 20)
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
`;
var PY_RUNTIME = `
def __tk_main():
    data = sys.stdin.read().split()
    pos = [0]
    def tok():
        pos[0] += 1
        return data[pos[0] - 1]
    def rd(t):
        if t in ('int', 'long'): return int(tok())
        if t == 'double': return float(tok())
        if t == 'bool': return tok() == '1'
        if t == 'char': return chr(int(tok()))
        if t == 'string':
            n = int(tok())
            return ''.join(chr(int(tok())) for _ in range(n))
        if t == 'ListNode':
            v = rd('int[]')
            h = None
            for x in reversed(v): h = ListNode(x, h)
            return h
        if t == 'TreeNode':
            n = int(tok())
            v = []
            for _ in range(n):
                x = tok()
                v.append(None if x == '#' else int(x))
            if not v or v[0] is None: return None
            root = TreeNode(v[0]); q = [root]; i = 1; k = 0
            while k < len(q) and i < len(v):
                node = q[k]; k += 1
                if i < len(v) and v[i] is not None:
                    node.left = TreeNode(v[i]); q.append(node.left)
                i += 1
                if i < len(v) and v[i] is not None:
                    node.right = TreeNode(v[i]); q.append(node.right)
                i += 1
            return root
        el = t[:-2] if t.endswith('[]') else t[5:-1]
        n = int(tok())
        return [rd(el) for _ in range(n)]
    def ser(t, v):
        if t == 'void': return None
        if v is None and t not in ('ListNode', 'TreeNode'): return None
        if t in ('int', 'long'): return int(v)
        if t == 'double': return float(v)
        if t == 'bool': return bool(v)
        if t in ('char', 'string'): return str(v)
        if t == 'ListNode':
            out = []
            while v is not None and len(out) < 100000:
                out.append(v.val); v = v.next
            return out
        if t == 'TreeNode':
            out = []; q = [v]; k = 0
            while k < len(q) and k < 200000:
                n = q[k]; k += 1
                out.append(n.val if n else None)
                if n: q.append(n.left); q.append(n.right)
            while out and out[-1] is None: out.pop()
            return out
        el = t[:-2] if t.endswith('[]') else t[5:-1]
        return [ser(el, x) for x in v]
    def out(i, ok, ms, payload):
        sys.stdout.write('\\n@@%s %d %s %.2f %s\\n' % (nonce, i, 'OK' if ok else 'ERR', ms, json.dumps(payload)))
        sys.stdout.flush()
    nonce = tok(); count = int(tok())
    for i in range(count):
__BODY__
import threading
threading.stack_size(256 * 1024 * 1024)
__tk_thread = threading.Thread(target=__tk_main)
__tk_thread.start()
__tk_thread.join()
`;
function pyDriver(sig) {
  let body;
  if (sig.kind === "function") {
    const outIndex = sig.outputParam ? sig.params.findIndex((p) => p.name === sig.outputParam) : -1;
    const result = outIndex >= 0 ? `ser(${JSON.stringify(sig.params[outIndex].type)}, a[${outIndex}])` : `ser(${JSON.stringify(sig.returns)}, r)`;
    body = `        a = [${sig.params.map((p) => `rd(${JSON.stringify(p.type)})`).join(", ")}]
        s = time.perf_counter()
        try:
            r = Solution().${sig.name}(*a)
            out(i, True, (time.perf_counter() - s) * 1000, ${result})
        except BaseException as e:
            out(i, False, (time.perf_counter() - s) * 1000, '%s: %s' % (type(e).__name__, e))`;
  } else {
    const types = JSON.stringify([
      sig.constructorParams.map((p) => p.type),
      ...sig.methods.map((m) => m.params.map((p) => p.type))
    ]);
    const names = JSON.stringify(sig.methods.map((m) => m.name));
    const returns = JSON.stringify(sig.methods.map((m) => m.returns));
    body = `        n = int(tok()); calls = []
        for _ in range(n):
            op = int(tok())
            calls.append((op, [rd(t) for t in ${types}[op]]))
        s = time.perf_counter()
        try:
            res = []; obj = None
            for op, a in calls:
                if op == 0:
                    obj = ${sig.className}(*a); res.append(None)
                else:
                    res.append(ser(${returns}[op - 1], getattr(obj, ${names}[op - 1])(*a)))
            out(i, True, (time.perf_counter() - s) * 1000, res)
        except BaseException as e:
            out(i, False, (time.perf_counter() - s) * 1000, '%s: %s' % (type(e).__name__, e))`;
  }
  return PY_RUNTIME.replace("__BODY__", body);
}
var JAVA_IMPORTS = "import java.util.*; import java.util.function.*; import java.util.stream.*;\n";
var JAVA_NODES = {
  "ListNode.java": `public class ListNode { public int val; public ListNode next; public ListNode() {} public ListNode(int val) { this.val = val; } public ListNode(int val, ListNode next) { this.val = val; this.next = next; } }
`,
  "TreeNode.java": `public class TreeNode { public int val; public TreeNode left; public TreeNode right; public TreeNode() {} public TreeNode(int val) { this.val = val; } public TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; } }
`
};
var JAVA_RUNTIME = `
  static String[] tk; static int tp = 0;
  static String t() { return tk[tp++]; }
  @SuppressWarnings("unchecked")
  static Object rd(String t) {
    switch (t) {
      case "int": return Integer.parseInt(t());
      case "long": return Long.parseLong(t());
      case "double": return Double.parseDouble(t());
      case "bool": return t().equals("1");
      case "char": return (char) Integer.parseInt(t());
      case "string": { int n = Integer.parseInt(t()); StringBuilder sb = new StringBuilder(); for (int i = 0; i < n; i++) sb.append((char) Integer.parseInt(t())); return sb.toString(); }
      case "int[]": { int n = Integer.parseInt(t()); int[] a = new int[n]; for (int i = 0; i < n; i++) a[i] = Integer.parseInt(t()); return a; }
      case "long[]": { int n = Integer.parseInt(t()); long[] a = new long[n]; for (int i = 0; i < n; i++) a[i] = Long.parseLong(t()); return a; }
      case "double[]": { int n = Integer.parseInt(t()); double[] a = new double[n]; for (int i = 0; i < n; i++) a[i] = Double.parseDouble(t()); return a; }
      case "bool[]": { int n = Integer.parseInt(t()); boolean[] a = new boolean[n]; for (int i = 0; i < n; i++) a[i] = t().equals("1"); return a; }
      case "char[]": { int n = Integer.parseInt(t()); char[] a = new char[n]; for (int i = 0; i < n; i++) a[i] = (char) Integer.parseInt(t()); return a; }
      case "string[]": { int n = Integer.parseInt(t()); String[] a = new String[n]; for (int i = 0; i < n; i++) a[i] = (String) rd("string"); return a; }
      case "int[][]": { int n = Integer.parseInt(t()); int[][] a = new int[n][]; for (int i = 0; i < n; i++) a[i] = (int[]) rd("int[]"); return a; }
      case "char[][]": { int n = Integer.parseInt(t()); char[][] a = new char[n][]; for (int i = 0; i < n; i++) a[i] = (char[]) rd("char[]"); return a; }
      case "string[][]": { int n = Integer.parseInt(t()); String[][] a = new String[n][]; for (int i = 0; i < n; i++) a[i] = (String[]) rd("string[]"); return a; }
      case "ListNode": { int[] v = (int[]) rd("int[]"); ListNode h = null; for (int i = v.length - 1; i >= 0; i--) h = new ListNode(v[i], h); return h; }
      case "TreeNode": { int n = Integer.parseInt(t()); Integer[] v = new Integer[n]; for (int i = 0; i < n; i++) { String x = t(); v[i] = x.equals("#") ? null : Integer.parseInt(x); }
        if (n == 0 || v[0] == null) return null; TreeNode root = new TreeNode(v[0]); ArrayList<TreeNode> q = new ArrayList<>(); q.add(root); int i = 1;
        for (int k = 0; k < q.size() && i < n; k++) { TreeNode node = q.get(k); if (i < n && v[i] != null) { node.left = new TreeNode(v[i]); q.add(node.left); } i++; if (i < n && v[i] != null) { node.right = new TreeNode(v[i]); q.add(node.right); } i++; }
        return root; }
      default: {
        String el = t.substring(5, t.length() - 1); int n = Integer.parseInt(t()); ArrayList<Object> a = new ArrayList<>(); for (int i = 0; i < n; i++) a.add(rd(el)); return a; }
    }
  }
  static String js(String s) {
    StringBuilder b = new StringBuilder("\\"");
    for (char c : s.toCharArray()) { if (c == '"' || c == '\\\\') b.append('\\\\').append(c); else if (c == '\\n') b.append("\\\\n"); else if (c == '\\r') b.append("\\\\r"); else if (c == '\\t') b.append("\\\\t"); else if (c < 32 || c > 126) b.append(String.format("\\\\u%04x", (int) c)); else b.append(c); }
    return b.append('"').toString();
  }
  static String ser(String t, Object v) {
    if (t.equals("void")) return "null";
    if (t.equals("ListNode")) { StringBuilder b = new StringBuilder("["); int c = 0; for (ListNode n = (ListNode) v; n != null && c < 100000; n = n.next, c++) { if (c > 0) b.append(','); b.append(n.val); } return b.append(']').toString(); }
    if (t.equals("TreeNode")) { ArrayList<TreeNode> q = new ArrayList<>(); q.add((TreeNode) v); ArrayList<String> out = new ArrayList<>();
      for (int k = 0; k < q.size() && k < 200000; k++) { TreeNode n = q.get(k); out.add(n == null ? "null" : String.valueOf(n.val)); if (n != null) { q.add(n.left); q.add(n.right); } }
      while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1); return "[" + String.join(",", out) + "]"; }
    if (v == null) return "null";
    switch (t) {
      case "int": case "long": return String.valueOf(((Number) v).longValue());
      case "double": { double d = ((Number) v).doubleValue(); return Double.isFinite(d) ? String.valueOf(d) : "null"; }
      case "bool": return String.valueOf((Boolean) v);
      case "char": return js(String.valueOf((Character) v));
      case "string": return js((String) v);
    }
    String el = t.endsWith("[]") ? t.substring(0, t.length() - 2) : t.substring(5, t.length() - 1);
    StringBuilder b = new StringBuilder("[");
    if (v instanceof List) { int i = 0; for (Object x : (List<?>) v) { if (i++ > 0) b.append(','); b.append(ser(el, x)); } }
    else { int n = java.lang.reflect.Array.getLength(v); for (int i = 0; i < n; i++) { if (i > 0) b.append(','); b.append(ser(el, java.lang.reflect.Array.get(v, i))); } }
    return b.append(']').toString();
  }
  static String nonce;
  static void out(int i, boolean ok, double ms, String payload) {
    System.out.print("\\n@@" + nonce + " " + i + " " + (ok ? "OK" : "ERR") + " " + String.format(Locale.ROOT, "%.2f", ms) + " " + payload + "\\n");
    System.out.flush();
  }
  static String err(Throwable e) {
    String m = e.toString();
    StackTraceElement[] st = e.getStackTrace();
    for (StackTraceElement s : st) if (!s.getClassName().equals("Main")) { m += " at " + s; break; }
    return js(m);
  }
  public static void main(String[] args) throws Exception {
    tk = new String(System.in.readAllBytes()).trim().split("\\\\s+");
    Thread th = new Thread(null, () -> { try { body(); } catch (Throwable e) { throw new RuntimeException(e); } }, "judge", 512L << 20);
    th.start(); th.join();
    System.out.flush();
  }
`;
var javaRead = (t) => javaBox[t] ? `(${javaBox[t]}) rd("${t}")` : `(${javaType[t]}) rd("${t}")`;
function javaDriver(sig) {
  let body;
  if (sig.kind === "function") {
    const locals = sig.params.map((p, i) => `${javaType[p.type]} a${i} = ${javaRead(p.type)};`).join(" ");
    const call = `new Solution().${sig.name}(${sig.params.map((_, i) => `a${i}`).join(", ")})`;
    const outIndex = sig.outputParam ? sig.params.findIndex((p) => p.name === sig.outputParam) : -1;
    const result = outIndex >= 0 ? `${call}; String p = ser("${sig.params[outIndex].type}", a${outIndex});` : sig.returns === "void" ? `${call}; String p = "null";` : `String p = ser("${sig.returns}", ${call});`;
    body = `for (int i = 0; i < count; i++) {
      ${locals}
      long s = System.nanoTime();
      try { ${result} out(i, true, (System.nanoTime() - s) / 1e6, p); }
      catch (Throwable e) { out(i, false, (System.nanoTime() - s) / 1e6, err(e)); }
    }`;
  } else {
    const ctorArgs = sig.constructorParams.map((p) => javaRead(p.type)).join(", ");
    const cases = sig.methods.map((m, k) => {
      const args = m.params.map((p, i) => `${javaType[p.type]} a${i} = ${javaRead(p.type)};`).join(" ");
      const call = `o[0].${m.name}(${m.params.map((_, i) => `a${i}`).join(", ")})`;
      const push = m.returns === "void" ? `${call}; res.add("null");` : `res.add(ser("${m.returns}", ${call}));`;
      return `          case ${k + 1}: { ${args} ops.add(() -> { ${push} }); break; }`;
    }).join("\n");
    body = `for (int i = 0; i < count; i++) {
      int n = Integer.parseInt(t());
      ArrayList<Runnable> ops = new ArrayList<>(); ArrayList<String> res = new ArrayList<>();
      final ${sig.className}[] o = new ${sig.className}[1];
      for (int k = 0; k < n; k++) {
        int op = Integer.parseInt(t());
        switch (op) {
          case 0: { ${sig.constructorParams.map((p, j) => `${javaType[p.type]} c${j} = ${javaRead(p.type)};`).join(" ")} ops.add(() -> { o[0] = new ${sig.className}(${sig.constructorParams.map((_, j) => `c${j}`).join(", ")}); res.add("null"); }); break; }
${cases}
        }
      }
      long s = System.nanoTime();
      try { for (Runnable r : ops) r.run(); out(i, true, (System.nanoTime() - s) / 1e6, "[" + String.join(",", res) + "]"); }
      catch (Throwable e) { out(i, false, (System.nanoTime() - s) / 1e6, err(e)); }
    }`;
  }
  return `${JAVA_IMPORTS}public class Main {${JAVA_RUNTIME}
  static void body() {
    nonce = t(); int count = Integer.parseInt(t());
    ${body}
  }
}
`;
}
var CPP_PRELUDE = `#include <bits/stdc++.h>
using namespace std;
struct ListNode { int val; ListNode *next; ListNode() : val(0), next(nullptr) {} ListNode(int x) : val(x), next(nullptr) {} ListNode(int x, ListNode *next) : val(x), next(next) {} };
struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode() : val(0), left(nullptr), right(nullptr) {} TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {} };
`;
var CPP_RUNTIME = `
namespace tkj {
static vector<string> tk; static size_t tp = 0;
static string t() { return tk[tp++]; }
template <class T> struct Rd;
template <> struct Rd<int> { static int r() { return stoi(t()); } };
template <> struct Rd<long long> { static long long r() { return stoll(t()); } };
template <> struct Rd<double> { static double r() { return stod(t()); } };
template <> struct Rd<bool> { static bool r() { return t() == "1"; } };
template <> struct Rd<char> { static char r() { return (char)stoi(t()); } };
template <> struct Rd<string> { static string r() { int n = stoi(t()); string s; for (int i = 0; i < n; i++) s += (char)stoi(t()); return s; } };
template <class T> struct Rd<vector<T>> { static vector<T> r() { int n = stoi(t()); vector<T> v; v.reserve(n); for (int i = 0; i < n; i++) v.push_back(Rd<T>::r()); return v; } };
template <> struct Rd<ListNode*> { static ListNode* r() { vector<int> v = Rd<vector<int>>::r(); ListNode* h = nullptr; for (int i = (int)v.size() - 1; i >= 0; i--) h = new ListNode(v[i], h); return h; } };
template <> struct Rd<TreeNode*> { static TreeNode* r() { int n = stoi(t()); vector<string> v(n); for (int i = 0; i < n; i++) v[i] = t();
  if (n == 0 || v[0] == "#") return nullptr; TreeNode* root = new TreeNode(stoi(v[0])); vector<TreeNode*> q{root}; int i = 1;
  for (size_t k = 0; k < q.size() && i < n; k++) { TreeNode* node = q[k]; if (i < n && v[i] != "#") { node->left = new TreeNode(stoi(v[i])); q.push_back(node->left); } i++; if (i < n && v[i] != "#") { node->right = new TreeNode(stoi(v[i])); q.push_back(node->right); } i++; }
  return root; } };
static string js(const string& s) { string b = "\\""; char buf[8]; for (unsigned char c : s) { if (c == '"' || c == '\\\\') { b += '\\\\'; b += (char)c; } else if (c == '\\n') b += "\\\\n"; else if (c == '\\t') b += "\\\\t"; else if (c == '\\r') b += "\\\\r"; else if (c < 32 || c > 126) { snprintf(buf, sizeof buf, "\\\\u%04x", c); b += buf; } else b += (char)c; } return b + "\\""; }
static string ser(int v) { return to_string(v); }
static string ser(long v) { return to_string(v); }
static string ser(long long v) { return to_string(v); }
static string ser(unsigned v) { return to_string(v); }
static string ser(unsigned long v) { return to_string(v); }
static string ser(unsigned long long v) { return to_string(v); }
static string ser(double v) { if (!isfinite(v)) return "null"; char buf[64]; snprintf(buf, sizeof buf, "%.17g", v); return buf; }
static string ser(bool v) { return v ? "true" : "false"; }
static string ser(char v) { return js(string(1, v)); }
static string ser(const string& v) { return js(v); }
static string ser(const char* v) { return js(string(v)); }
static string ser(ListNode* h) { string b = "["; int c = 0; for (ListNode* n = h; n && c < 100000; n = n->next, c++) { if (c) b += ","; b += to_string(n->val); } return b + "]"; }
static string ser(TreeNode* root) { vector<TreeNode*> q{root}; vector<string> out; for (size_t k = 0; k < q.size() && k < 200000; k++) { TreeNode* n = q[k]; out.push_back(n ? to_string(n->val) : "null"); if (n) { q.push_back(n->left); q.push_back(n->right); } }
  while (!out.empty() && out.back() == "null") out.pop_back(); string b = "["; for (size_t i = 0; i < out.size(); i++) { if (i) b += ","; b += out[i]; } return b + "]"; }
template <class T> static string ser(const vector<T>& v) { string b = "["; bool first = true; for (const auto& x : v) { if (!first) b += ","; first = false; b += ser(x); } return b + "]"; }
static string nonce;
static void out(int i, bool ok, double ms, const string& payload) { char buf[64]; snprintf(buf, sizeof buf, "%.2f", ms); cout << "\\n@@" << nonce << " " << i << " " << (ok ? "OK" : "ERR") << " " << buf << " " << payload << "\\n" << flush; }
static double now() { return chrono::duration<double, milli>(chrono::steady_clock::now().time_since_epoch()).count(); }
}
`;
function cppDriver(sig) {
  let body;
  if (sig.kind === "function") {
    const locals = sig.params.map((p, i) => `${cppType(p.type)} a${i} = tkj::Rd<${cppType(p.type)}>::r();`).join(" ");
    const call = `sol.${sig.name}(${sig.params.map((_, i) => `a${i}`).join(", ")})`;
    const outIndex = sig.outputParam ? sig.params.findIndex((p) => p.name === sig.outputParam) : -1;
    const result = outIndex >= 0 ? `${call}; string p = tkj::ser(a${outIndex});` : sig.returns === "void" ? `${call}; string p = "null";` : `string p = tkj::ser(${call});`;
    body = `for (int i = 0; i < count; i++) {
    ${locals}
    double s = tkj::now();
    try { Solution sol; ${result} tkj::out(i, true, tkj::now() - s, p); }
    catch (const exception& e) { tkj::out(i, false, tkj::now() - s, tkj::js(string("exception: ") + e.what())); }
    catch (...) { tkj::out(i, false, tkj::now() - s, tkj::js("exception")); }
  }`;
  } else {
    const cases = sig.methods.map((m, k) => {
      const args = m.params.map(
        (p, i) => `auto a${i} = make_shared<${cppType(p.type)}>(tkj::Rd<${cppType(p.type)}>::r());`
      ).join(" ");
      const call = `obj->${m.name}(${m.params.map((_, i) => `*a${i}`).join(", ")})`;
      const push = m.returns === "void" ? `${call}; res.push_back("null");` : `res.push_back(tkj::ser(${call}));`;
      return `        case ${k + 1}: { ${args} ops.push_back([&, ${m.params.map((_, i) => `a${i}`).join(", ")}]() { ${push} }); break; }`.replace(
        "[&, ]",
        "[&]"
      );
    }).join("\n");
    const ctorLocals = sig.constructorParams.map(
      (p, j) => `auto c${j} = make_shared<${cppType(p.type)}>(tkj::Rd<${cppType(p.type)}>::r());`
    ).join(" ");
    const ctorCapture = sig.constructorParams.map((_, j) => `, c${j}`).join("");
    body = `for (int i = 0; i < count; i++) {
    int n = stoi(tkj::t());
    vector<function<void()>> ops; vector<string> res; ${sig.className}* obj = nullptr;
    for (int k = 0; k < n; k++) {
      int op = stoi(tkj::t());
      switch (op) {
        case 0: { ${ctorLocals} ops.push_back([&${ctorCapture}]() { obj = new ${sig.className}(${sig.constructorParams.map((_, j) => `*c${j}`).join(", ")}); res.push_back("null"); }); break; }
${cases}
      }
    }
    double s = tkj::now();
    try { for (auto& f : ops) f(); string b = "["; for (size_t j = 0; j < res.size(); j++) { if (j) b += ","; b += res[j]; } tkj::out(i, true, tkj::now() - s, b + "]"); }
    catch (const exception& e) { tkj::out(i, false, tkj::now() - s, tkj::js(string("exception: ") + e.what())); }
    catch (...) { tkj::out(i, false, tkj::now() - s, tkj::js("exception")); }
  }`;
  }
  return `
int main() {
  ios::sync_with_stdio(false);
  { string w; while (cin >> w) tkj::tk.push_back(w); }
  tkj::nonce = tkj::t(); int count = stoi(tkj::t());
  ${body}
  return 0;
}
`;
}
var lines = (s) => s.split("\n").length - 1;
function buildProgram(sig, language, code) {
  switch (language) {
    case "javascript": {
      const file = `${JS_PRELUDE}${code}
;(() => {${jsDriver(sig)}})();
`;
      return {
        files: { "main.js": file },
        compile: ["node", "--check", "main.js"],
        run: [
          "bash",
          "-c",
          "ulimit -s unlimited 2>/dev/null; exec node --stack-size=65500 main.js < input.txt"
        ],
        lineOffset: lines(JS_PRELUDE),
        sourceFile: "main.js"
      };
    }
    case "python": {
      const file = `${PY_PRELUDE}${code}
${pyDriver(sig)}`;
      return {
        files: { "main.py": file },
        compile: [
          "python3",
          "-c",
          "import ast, sys\ntry:\n    ast.parse(open('main.py').read(), 'main.py')\nexcept SyntaxError as e:\n    print('main.py:%s: SyntaxError: %s' % (e.lineno, e.msg))\n    print((e.text or '').rstrip())\n    sys.exit(1)"
        ],
        run: ["bash", "-c", "exec python3 main.py < input.txt"],
        lineOffset: lines(PY_PRELUDE),
        sourceFile: "main.py"
      };
    }
    case "java": {
      const learnerFile = sig.kind === "design" ? `${sig.className}.java` : "Solution.java";
      return {
        files: {
          [learnerFile]: `${JAVA_IMPORTS}${code}
`,
          "Main.java": javaDriver(sig),
          ...JAVA_NODES
        },
        compile: ["bash", "-c", "javac -nowarn -encoding UTF-8 -d . *.java 2>&1"],
        run: [
          "bash",
          "-c",
          "exec java -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xmx384m -Xss512m -cp . Main < input.txt"
        ],
        lineOffset: lines(JAVA_IMPORTS),
        sourceFile: learnerFile
      };
    }
    case "cpp": {
      const file = `${CPP_PRELUDE}${code}
${CPP_RUNTIME}${cppDriver(sig)}`;
      return {
        files: { "main.cpp": file },
        compile: ["g++", "-O2", "-std=c++17", "-w", "-o", "main", "main.cpp"],
        run: ["bash", "-c", "ulimit -s unlimited 2>/dev/null; exec ./main < input.txt"],
        lineOffset: lines(CPP_PRELUDE),
        sourceFile: "main.cpp"
      };
    }
  }
}

// dsa/judge/dsaVerdict.rules.ts
var MAX_CONSOLE = 4e3;
function parseRun(stdout, nonce, count) {
  const runs = Array.from({ length: count }, (_, index) => ({
    index,
    status: "missing",
    ms: null,
    value: void 0,
    error: null,
    console: ""
  }));
  const marker = new RegExp(`^@@${nonce} (\\d+) (OK|ERR) ([0-9.]+) (.*)$`);
  let buffer = [];
  let next = 0;
  for (const line of stdout.split("\n")) {
    const m = marker.exec(line);
    if (!m) {
      buffer.push(line);
      continue;
    }
    const index = Number(m[1]);
    const run = runs[index];
    if (!run || run.status !== "missing" || index !== next) continue;
    next = index + 1;
    run.console = buffer.join("\n").replace(/^\n+|\n+$/g, "").slice(0, MAX_CONSOLE);
    buffer = [];
    run.ms = Number(m[3]);
    let payload;
    try {
      payload = JSON.parse(m[4]);
    } catch {
      payload = void 0;
    }
    if (m[2] === "OK" && payload !== void 0) {
      run.status = "ok";
      run.value = payload;
    } else {
      run.status = "error";
      run.error = typeof payload === "string" ? payload.slice(0, 2e3) : "Runtime error";
    }
  }
  const pending = runs.find((r) => r.status === "missing");
  if (pending)
    pending.console = buffer.join("\n").replace(/^\n+|\n+$/g, "").slice(0, MAX_CONSOLE);
  return runs;
}
var key = (v) => JSON.stringify(v);
var sortDeep = (v) => Array.isArray(v) ? v.map((x) => sortDeep(x)).sort((a, b) => key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0) : v;
function nearlyEqual(a, b, eps) {
  if (typeof a === "number" && typeof b === "number")
    return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => nearlyEqual(x, b[i], eps));
  return key(a) === key(b);
}
var hasDouble = (t) => t === "double" || t === "double[]";
function matches(expected, actual, mode, returnType) {
  if (actual === void 0) return false;
  if (mode === "float" || hasDouble(returnType)) return nearlyEqual(expected, actual, 1e-5);
  if (mode === "unordered") {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return key(expected) === key(actual);
    return key([...expected].map(key).sort()) === key([...actual].map(key).sort());
  }
  if (mode === "unorderedDeep") return key(sortDeep(expected)) === key(sortDeep(actual));
  return key(expected) === key(actual);
}
function verdictOf(i) {
  const failed = i.runs.findIndex((r, k) => r.status !== "ok" || !i.passed[k]);
  if (failed < 0) return { verdict: "accepted", failedIndex: null };
  const run = i.runs[failed];
  if (run.status === "ok") return { verdict: "wrong_answer", failedIndex: failed };
  if (run.status === "error") return { verdict: "runtime_error", failedIndex: failed };
  if (i.timedOut) return { verdict: "time_limit_exceeded", failedIndex: failed };
  if (i.exitCode === 137) return { verdict: "memory_limit_exceeded", failedIndex: failed };
  return { verdict: "runtime_error", failedIndex: failed };
}
function crashMessage(exitCode, stderr) {
  const tail = stderr.trim().split("\n").slice(-6).join("\n");
  if (exitCode === 139)
    return `Segmentation fault (invalid memory access)${tail ? `
${tail}` : ""}`;
  if (exitCode === 134) return `Aborted${tail ? `
${tail}` : ""}`;
  if (exitCode === 137) return "Memory limit exceeded";
  return tail || `Process exited with code ${exitCode}`;
}

// dsa/genie/codingGenie.rules.ts
var SOLUTION_AFTER_FAILED_SUBMITS = 3;
function solutionAllowed(ctx) {
  return ctx.solved || ctx.failedSubmits >= SOLUTION_AFTER_FAILED_SUBMITS && ctx.hintsRevealed >= 3;
}
var clipText = (s, n) => s.length > n ? `${s.slice(0, n)}
\u2026[truncated]` : s;
var verdictText = {
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  runtime_error: "Runtime error",
  time_limit_exceeded: "Time limit exceeded",
  memory_limit_exceeded: "Memory limit exceeded",
  compile_error: "Compilation error"
};
function stubAnswer(mode, ctx, turn) {
  const a = ctx.approach;
  const offline = "\n\n_Genie is in offline mode: these notes come from the problem authors._";
  if (!ctx.inApp || !a)
    return `**${ctx.title}** is practised on ${ctx.links.map((l) => `[${l.site}](${l.url})`).join(" or ")}. Patterns to think about: ${ctx.patterns.join(", ")}. Mark it solved here when you are done.${offline}`;
  switch (mode) {
    case "explain":
      return `**What you are asked**

${ctx.statement}

**Limits that matter**
${ctx.constraints.map((c) => `- ${c}`).join("\n")}

Read the first example on the left: trace it by hand before writing code, and check which value must be returned.${offline}`;
    case "approach":
      return `**Start simple:** write the most direct solution first and work out its cost against the limits.

**Key idea:** ${a.idea}

**Target:** time ${a.complexity.time}, space ${a.complexity.space}.

**Watch out for:** ${a.pitfalls.join("; ")}.${offline}`;
    case "hint": {
      const next = Math.min(ctx.hintsRevealed, ctx.hints.length - 1);
      return `**Hint ${next + 1} of ${ctx.hints.length}:** ${ctx.hints[next]}${offline}`;
    }
    case "debug": {
      const last = ctx.lastAttempt;
      if (!last)
        return `Run your code first, then ask again and I will look at the result.${offline}`;
      const fc = last.failedCase ?? {};
      const v = verdictText[last.verdict] ?? last.verdict;
      if (last.verdict === "accepted")
        return `Your last ${last.mode} passed ${last.passed}/${last.total} cases. Nothing to debug \u2014 try Submit, or ask for a review.${offline}`;
      if (last.verdict === "compile_error")
        return `**${v}.** The compiler says:

\`\`\`
${String(fc.compileOutput ?? "").split("\n").slice(0, 8).join(
          "\n"
        )}
\`\`\`
Fix the first error first; later ones are often caused by it.${offline}`;
      if (last.verdict === "time_limit_exceeded")
        return `**${v}** (${last.passed}/${last.total} passed). Your approach is too slow for the limits. The target is **${a.complexity.time}**. ${a.idea}${offline}`;
      const detail = [
        fc.input !== void 0 ? `- Input: \`${JSON.stringify(fc.input)}\`` : "",
        fc.expected !== void 0 ? `- Expected: \`${JSON.stringify(fc.expected)}\`` : "",
        fc.output !== void 0 && fc.output !== null ? `- Your output: \`${JSON.stringify(fc.output)}\`` : "",
        fc.error ? `- Error: \`${String(fc.error).split("\n")[0]}\`` : ""
      ].filter(Boolean).join("\n");
      return `**${v}** on case ${Number(fc.index ?? 0) + 1} (${last.passed}/${last.total} passed).

${detail}

Trace this case by hand through your code. Common causes here: ${a.pitfalls.join("; ")}.${offline}`;
    }
    case "review":
      return `Compare your code with the target **time ${a.complexity.time}, space ${a.complexity.space}**. Check these edge cases from the constraints: ${ctx.constraints.join("; ")}. Typical mistakes: ${a.pitfalls.join("; ")}.${offline}`;
    case "solution":
      return `**Approach**

${a.idea}

${a.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

**Complexity:** time ${a.complexity.time}, space ${a.complexity.space}.${offline}`;
    case "ask":
      return `${turn.message ? "Here is what the problem notes say that relates to your question.\n\n" : ""}**Key idea:** ${a.idea}

Next hint: ${ctx.hints[Math.min(ctx.hintsRevealed, ctx.hints.length - 1)]}${offline}`;
  }
}
function learnerRecord(mode, turn) {
  const labels = {
    explain: "Explain this problem",
    approach: "How should I approach this?",
    hint: "Give me a hint",
    debug: "Why is my code failing?",
    review: "Review my code",
    ask: "Question",
    solution: "Show me the solution"
  };
  return turn.message?.trim() ? clipText(turn.message.trim(), 2e3) : labels[mode];
}
export {
  SOLUTION_AFTER_FAILED_SUBMITS,
  buildProgram,
  crashMessage,
  encodeArgs,
  encodeDesignCalls,
  learnerRecord,
  matches,
  parseRun,
  solutionAllowed,
  starterCode,
  stubAnswer,
  verdictOf
};
