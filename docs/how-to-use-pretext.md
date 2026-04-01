# @chenglou/pretext 使用指南（基于 `main` 与 npm 0.0.3）

> 目标：把“文本测量”从 DOM 高成本测量路径中拿出来。  
> 实践上：**高频阶段主要走 `layout()` 的纯计算路径**；`prepare()` 在特定条件下可能做一次按字体缓存的校准读。

## 1. 适用场景

- 虚拟列表/瀑布流：需要提前估算文本高度
- 聊天流：减少文本到达后的布局抖动
- 自定义渲染：Canvas / SVG / WebGL 手工排版
- 多语言文本：中英混排、阿拉伯文、emoji

---

## 2. 安装

```bash
npm i @chenglou/pretext
```

---

## 3. 运行环境（先看）

当前包主要面向浏览器环境：内部需要可用的 canvas 文本测量上下文。

- 有 `OffscreenCanvas`：可直接用
- 或有 DOM canvas（`document.createElement('canvas')`）：可用
- 两者都没有（典型纯 Node/SSR 直跑）：`prepare` 会抛错

如果你要在服务端使用，需要自行提供可用的 canvas 运行环境后再评估接入。

---

## 4. 最小示例：只算高度

```ts
import { prepare, layout } from '@chenglou/pretext'

const text = 'AGI 春天到了. بدأت الرحلة 🚀'
const font = '16px Inter' // 必须和真实渲染 font 一致
const lineHeight = 22      // 必须和真实 line-height 一致
const width = 280

const prepared = prepare(text, font) // 文本/字体变化时调用
const { height, lineCount } = layout(prepared, width, lineHeight) // 宽度变化时高频调用
console.log(height, lineCount)
```

### 调用节奏建议

- 文本内容或字体变化：重新 `prepare()`
- 仅宽度变化：复用 prepared，只跑 `layout()`

---

## 5. textarea 场景：保留空格/Tab/换行

```ts
const prepared = prepare(value, '16px Inter', { whiteSpace: 'pre-wrap' })
const { height } = layout(prepared, textareaWidth, 22)
```

`pre-wrap` 模式会保留普通空格、`\t`、`\n`（tab 按默认 `tab-size: 8`）。

---

## 6. 手工排版 API（拿每一行）

### 6.1 固定宽度，直接拿 lines

```ts
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

const prepared = prepareWithSegments(text, '18px "Helvetica Neue"')
const { lines } = layoutWithLines(prepared, 320, 26)

for (const line of lines) {
  // line.text / line.width / line.start / line.end
}
```

### 6.2 只遍历行范围（不拼文本）

```ts
import { prepareWithSegments, walkLineRanges } from '@chenglou/pretext'

const prepared = prepareWithSegments(text, '18px "Helvetica Neue"')

let maxW = 0
walkLineRanges(prepared, 320, line => {
  if (line.width > maxW) maxW = line.width
})
```

适合先做“宽度试探”（例如 shrink-wrap），再做最终渲染。

### 6.3 每行宽度不同（绕排）

```ts
import { layoutNextLine } from '@chenglou/pretext'

let cursor = { segmentIndex: 0, graphemeIndex: 0 }

while (true) {
  const width = shouldNarrow() ? 200 : 320
  const line = layoutNextLine(prepared, cursor, width)
  if (!line) break

  draw(line.text)
  cursor = line.end
}
```

---

## 7. 默认排版假设（很重要）

库的默认目标接近以下 CSS 组合：

- `white-space: normal`
- `word-break: normal`
- `overflow-wrap: break-word`
- `line-break: auto`

这意味着：超窄宽度下会在 grapheme 边界断开（符合 `break-word` 预期）。

---

## 8. Vue 3 接入范式（简版）

```ts
import { computed, ref } from 'vue'
import { prepare, layout } from '@chenglou/pretext'

const text = ref('一段会变化的文本...')
const width = ref(300)
const font = '16px Inter'
const lineHeight = 22

const prepared = computed(() => prepare(text.value, font))
const boxHeight = computed(() => layout(prepared.value, width.value, lineHeight).height)
```

---

## 9. 常见坑

1. **`system-ui` 在 macOS 下不建议做精确测量**  
   建议用命名字体（Inter / Helvetica 等）。

2. **字体未加载完成就测量会偏差**  
   首次测量尽量放在字体 ready 后。

3. **避免把“零 DOM 读取”当作绝对保证**  
   `layout()` 热路径是纯计算；`prepare()` 在 emoji 校准路径可能出现一次 DOM 读取（按字体缓存）。

---

## 10. 其他 API

```ts
import { clearCache, setLocale } from '@chenglou/pretext'
```

- `clearCache()`：清理内部缓存
- `setLocale(locale?)`：设置 locale（会清缓存；影响后续 prepare）

---

## 11. 参考

- GitHub: https://github.com/chenglou/pretext
- README（npm 包内）：`node_modules/@chenglou/pretext/README.md`
- 在线 demos: https://chenglou.me/pretext/
