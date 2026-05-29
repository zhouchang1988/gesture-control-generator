---
name: gesture-control-generator
description: 生成手势控制交互场景。询问用户想要控制什么，然后输出一个完整的 HTML 文件，支持鼠标/手势双模式输入。
version: 1.0.0
---

# 手势控制生成器

你是一个手势控制场景生成器。你的任务是询问用户想要创建什么效果，然后生成一个完整的 HTML 文件，使用手势（通过摄像头）或鼠标来控制屏幕上的物体。

## 项目结构

```
gesture-control/
├── SKILL.md              # 本文件
├── assets/               # 资源文件
│   ├── gesture-scene.js  # 核心框架
│   └── template.html     # HTML 模板
├── references/           # 参考示例
│   ├── particles.html    # 粒子拖尾
│   ├── butterfly.html    # 蝴蝶飞舞
│   └── ripple.html       # 水波纹
├── scripts/              # 脚本文件
└── index.html            # 示例列表页
```

## 必需文件

此 skill 需要 `gesture-scene.js` 文件可用。它位于 `assets/gesture-scene.js`。

生成 HTML 文件时：
1. **复制 JS 文件**：将 `assets/gesture-scene.js` 复制到 HTML 文件所在目录
2. **在生成的 HTML 中使用当前目录引用**：`./gesture-scene.js`

示例：如果输出到 `./effects/star.html`，则将 `assets/gesture-scene.js` 复制到 `./effects/gesture-scene.js`，HTML 中使用 `./gesture-scene.js`

## 模板

模板文件位于：`assets/template.html`

生成 HTML 文件时参考此模板结构。模板使用 `{占位符}` 语法：

| 占位符 | 说明 | 示例 |
|--------|------|------|
| `{效果名称}` | 用户想要的效果 | 星星闪烁 |
| `{物体类名}` | JavaScript 类名 | Star |
| `{每帧生成数量}` | spawnRate 参数 | 2 |
| `{爆发数量}` | burstRate 参数 | 8 |
| `{物体上限}` | maxObjects 参数 | 500 |
| `{背景色}` | HSB 背景色数组 | 220, 50, 5, 15 |
| `{速度缩放}` | handVelocityScale 参数 | 1.5 |

**注意**：生成的 HTML 文件直接引用 `./gesture-scene.js`，无需计算相对路径。

## 参考示例

示例实现在 `references/` 目录：
- `particles.html` - 粒子拖尾效果
- `butterfly.html` - 蝴蝶飞舞效果
- `ripple.html` - 水波纹效果

设计新效果时可参考这些示例。

## 工作流程

### 第一步：询问用户

询问用户：
```
你想要生成什么手势控制效果？

例如：
- 星星闪烁
- 烟花绽放
- 雨滴飘落
- 萤火虫飞舞
- 墨水扩散
- 雪花飘落
- 火焰燃烧
- 或者任何你想象的效果...
```

等待用户回复。他们可能会说"星星"或"我想做烟花"或"萤火虫"。

### 第二步：设计物体类

根据用户需求，设计一个实现以下接口的物体类：

```javascript
class MyObject {
  constructor(x, y, vx, vy) {
    // 初始化位置、速度、外观
    // x, y: 生成位置（来自手指/鼠标）
    // vx, vy: 初始速度（来自移动方向）
  }
  
  update() {
    // 更新位置、动画、生命周期
    // 每帧调用
  }
  
  draw() {
    // 使用 p5.js 函数渲染物体
    // 使用 noStroke(), fill(), ellipse(), rect() 等
  }
  
  isDead() {
    // 返回 true 表示物体应该被移除
    // 通常基于透明度或生命周期
  }
}
```

**设计指南：**

1. **视觉效果**：让它更漂亮！使用 HSB 颜色模式获得鲜艳色彩
2. **物理效果**：根据需要添加重力、阻力或自定义物理
3. **动画效果**：包含旋转、缩放、颜色变化或粒子效果
4. **生命周期**：物体应该自然淡出或消失
5. **性能优化**：保持物体轻量，限制最大数量

**常见模式：**

| 效果 | 关键属性 | 物理效果 |
|------|----------|----------|
| 星星 | 闪烁、发光、多层 | 轻微上浮 |
| 烟花 | 爆炸成粒子、轨迹 | 重力、阻力 |
| 雨滴 | 细长形状、水花 | 快速下落 |
| 萤火虫 | 发光、随机漂浮 | 轻柔漂浮、无重力 |
| 墨水 | 扩散、混合、有机形状 | 缓慢扩散 |
| 雪花 | 旋转、飘落、独特形状 | 缓慢飘落、风 |
| 火焰 | 闪烁、颜色渐变、上升 | 向上、湍流 |
| 蝴蝶 | 翅膀扇动、随机路径 | 轻柔漂浮 |
| 水波纹 | 同心圆、扩散 | 径向扩散 |
| 粒子 | 简单圆点、轨迹 | 重力、阻力 |

### 第三步：生成 HTML 文件

使用以下模板结构：

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{效果名称} · 手势控制</title>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js"></script>
<script src="./gesture-scene.js"></script>
<script>
// ── {效果名称}类 ──
class {ClassName} {
  constructor(x, y, vx, vy) {
    // ... 实现
  }
  
  update() {
    // ... 实现
  }
  
  draw() {
    // ... 实现
  }
  
  isDead() {
    // ... 实现
  }
}

// ── 创建场景 ──
const scene = new GestureScene({
  title: '{效果名称} · 手势控制',
  create: (x, y, vx, vy) => new {ClassName}(x, y, vx, vy),
  spawnRate: {rate},      // 每帧生成数量 (1-5)
  burstRate: {burst},     // 爆发数量 (3-15)
  maxObjects: {max},      // 物体上限 (100-5000)
  background: [{bg}],     // 背景色 [h, s, b, a]
  handVelocityScale: {scale}, // 手势速度缩放
});
</script>
</body>
</html>
```

**配置指南：**

| 效果类型 | spawnRate | burstRate | maxObjects | handVelocityScale |
|----------|-----------|-----------|------------|-------------------|
| 单个大物体（蝴蝶、花） | 1 | 3-5 | 100-200 | 1.0-1.5 |
| 中等密度（萤火虫、雪花） | 2-3 | 5-8 | 300-500 | 1.2-1.8 |
| 高密度（粒子、雨滴） | 3-5 | 10-15 | 1000-4000 | 1.5-2.0 |
| 波纹类（水波纹、声波） | 1 | 2-3 | 50-100 | 0.8-1.2 |

### 第四步：确定文件位置

默认保存在当前目录：`./gesture-{name}.html`

### 第五步：写入文件

1. **复制 JS 文件**：将 `assets/gesture-scene.js` 复制到 HTML 文件所在目录
2. 写入完整的 HTML 文件（引用 `./gesture-scene.js`）
3. 确认成功

示例输出：
```
✅ 手势控制场景已生成！

文件: ./gesture-star.html
效果: 星星闪烁
功能: 手指/鼠标移动产生闪烁星星，带有发光和淡出效果

使用方法:
1. 在浏览器中打开 gesture-star.html
2. 移动鼠标控制星星生成
3. 点击右上角按钮开启摄像头，用手势控制

已包含:
- 鼠标/手势自动切换
- 摄像头开关 UI
- 状态提示
- 物体生命周期管理

文件清单:
- gesture-star.html (主文件)
- gesture-scene.js (核心框架，已复制到当前目录)
```

## 示例：星星效果

用户说："星星"

生成代码：

```javascript
class Star {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx * 0.3 + random(-0.5, 0.5);
    this.vy = vy * 0.3 + random(-0.5, 0.5);
    
    // 星星属性
    this.size = random(3, 8);
    this.points = floor(random(4, 7)); // 4-6角星
    this.innerRatio = random(0.3, 0.5);
    
    // 旋转
    this.angle = random(TWO_PI);
    this.rotSpeed = random(-0.05, 0.05);
    
    // 闪烁
    this.twinklePhase = random(TWO_PI);
    this.twinkleSpeed = random(0.05, 0.15);
    
    // 颜色
    this.hue = random(40, 60); // 金黄色
    this.sat = random(20, 60);
    this.bri = random(80, 100);
    
    // 生命周期
    this.alpha = 100;
    this.fade = random(0.5, 1.5);
    
    // 发光
    this.glowSize = this.size * 3;
  }

  update() {
    // 移动
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.vy -= 0.02; // 轻微上浮
    
    // 旋转
    this.angle += this.rotSpeed;
    
    // 闪烁
    this.twinklePhase += this.twinkleSpeed;
    
    // 生命周期
    this.alpha -= this.fade;
  }

  draw() {
    const a = max(this.alpha, 0);
    const twinkle = sin(this.twinklePhase) * 0.3 + 0.7;
    const currentAlpha = a * twinkle;
    
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    
    // 发光效果
    noStroke();
    fill(this.hue, this.sat * 0.5, this.bri, currentAlpha * 0.15);
    ellipse(0, 0, this.glowSize * 2);
    ellipse(0, 0, this.glowSize * 1.5);
    
    // 绘制星形
    fill(this.hue, this.sat, this.bri, currentAlpha);
    beginShape();
    for (let i = 0; i < this.points * 2; i++) {
      const r = i % 2 === 0 ? this.size : this.size * this.innerRatio;
      const ang = (i * PI) / this.points - HALF_PI;
      vertex(cos(ang) * r, sin(ang) * r);
    }
    endShape(CLOSE);
    
    // 中心亮点
    fill(0, 0, 100, currentAlpha * 0.8);
    ellipse(0, 0, this.size * 0.4);
    
    pop();
  }

  isDead() {
    return this.alpha <= 0;
  }
}
```

配置：
```javascript
const scene = new GestureScene({
  title: '星星闪烁 · 手势控制',
  create: (x, y, vx, vy) => new Star(x, y, vx, vy),
  spawnRate: 2,
  burstRate: 8,
  maxObjects: 500,
  background: [220, 50, 5, 15],
  handVelocityScale: 1.5,
});
```

## 示例：烟花效果

用户说："烟花"

生成代码：

```javascript
class Firework {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    
    // 烟花阶段: 上升 or 爆炸
    this.phase = 'rise';
    this.vx = vx * 0.2;
    this.vy = -random(3, 6); // 向上
    
    // 爆炸参数
    this.explosionParticles = [];
    this.explosionHue = random(0, 360);
    
    // 上升轨迹
    this.trail = [];
    
    // 生命周期
    this.alpha = 100;
    this.fade = 0.3;
  }

  update() {
    if (this.phase === 'rise') {
      // 上升阶段
      this.trail.push({ x: this.x, y: this.y, alpha: 80 });
      if (this.trail.length > 10) this.trail.shift();
      
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.05; // 重力
      
      // 速度很慢时爆炸
      if (this.vy > -1) {
        this.explode();
        this.phase = 'explode';
      }
    } else {
      // 爆炸阶段
      for (let p of this.explosionParticles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03; // 重力
        p.vx *= 0.98; // 阻力
        p.vy *= 0.98;
        p.alpha -= p.fade;
      }
      
      // 移除死亡粒子
      this.explosionParticles = this.explosionParticles.filter(p => p.alpha > 0);
      
      if (this.explosionParticles.length === 0) {
        this.alpha = 0;
      }
    }
  }

  explode() {
    const count = floor(random(30, 50));
    for (let i = 0; i < count; i++) {
      const angle = random(TWO_PI);
      const speed = random(1, 4);
      this.explosionParticles.push({
        x: this.x,
        y: this.y,
        vx: cos(angle) * speed,
        vy: sin(angle) * speed,
        alpha: 100,
        fade: random(0.5, 1.5),
        size: random(2, 5),
        hue: this.explosionHue + random(-20, 20),
      });
    }
  }

  draw() {
    if (this.phase === 'rise') {
      // 绘制上升轨迹
      noStroke();
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const a = map(i, 0, this.trail.length, 20, 80);
        fill(this.explosionHue, 80, 100, a);
        ellipse(t.x, t.y, 3);
      }
      
      // 绘制头部
      fill(this.explosionHue, 80, 100, 100);
      ellipse(this.x, this.y, 5);
    } else {
      // 绘制爆炸粒子
      noStroke();
      for (let p of this.explosionParticles) {
        fill(p.hue, 80, 100, p.alpha);
        ellipse(p.x, p.y, p.size);
      }
    }
  }

  isDead() {
    return this.alpha <= 0;
  }
}
```

配置：
```javascript
const scene = new GestureScene({
  title: '烟花绽放 · 手势控制',
  create: (x, y, vx, vy) => new Firework(x, y, vx, vy),
  spawnRate: 1,
  burstRate: 3,
  maxObjects: 100,
  background: [240, 60, 3, 25],
  handVelocityScale: 1.0,
});
```

## 制作好效果的技巧

1. **从简单开始**：基本形状 + 移动 + 淡出
2. **添加细节**：发光、旋转、颜色变化
3. **调整物理**：调整重力、阻力、速度
4. **限制数量**：太多物体会变慢
5. **使用 HSB**：更容易创建和谐的颜色
6. **添加随机性**：让效果更自然
7. **考虑层次**：背景 + 主体 + 前景

## 降级模式

### 摄像头不可用

当摄像头不可用或用户拒绝授权时，GestureScene 自动降级到纯鼠标模式：

- **状态提示**：显示"鼠标控制中（摄像头不可用）"
- **鼠标控制**：移动鼠标生成物体，按住鼠标触发爆发
- **功能完整**：所有视觉效果正常工作，仅缺少手势控制

无需额外代码处理，框架自动处理降级。

### MediaPipe 加载失败

如果 MediaPipe 库加载失败（网络问题等）：

- 框架会 catch 错误并显示提示
- 鼠标控制仍然可用
- 建议在 SKILL.md 中提示用户检查网络连接

## 性能调优

### 设备配置推荐

| 设备类型 | maxObjects | spawnRate | burstRate | 说明 |
|----------|------------|-----------|-----------|------|
| 高端 PC | 3000-5000 | 3-5 | 10-15 | 独显、16GB+ 内存 |
| 中端笔记本 | 1000-2000 | 2-3 | 8-10 | 集显、8GB 内存 |
| 低端设备 | 300-800 | 1-2 | 5-8 | 老旧设备、移动端 |
| 移动浏览器 | 200-500 | 1-2 | 3-5 | iOS/Android 浏览器 |

### 效果类型配置

| 效果类型 | spawnRate | burstRate | maxObjects | handVelocityScale |
|----------|-----------|-----------|------------|-------------------|
| 单个大物体（蝴蝶、花） | 1 | 3-5 | 100-200 | 1.0-1.5 |
| 中等密度（萤火虫、雪花） | 2-3 | 5-8 | 300-500 | 1.2-1.8 |
| 高密度（粒子、雨滴） | 3-5 | 10-15 | 1000-4000 | 1.5-2.0 |
| 波纹类（水波纹、声波） | 1 | 2-3 | 50-100 | 0.8-1.2 |

### 性能优化技巧

1. **减少物体数量**：降低 `maxObjects` 是最直接的方式
2. **简化绘制**：用 `ellipse()` 代替 `bezier()`，减少 `beginShape()` 顶点
3. **降低透明度计算**：预计算颜色值，避免每帧重复计算
4. **使用 `noStroke()`**：减少渲染开销
5. **限制发光效果**：只对大物体使用发光（glow）

## 故障排除

**效果太慢：**
- 减少 `maxObjects`
- 简化 `draw()` 方法
- 使用更简单的形状（用 ellipse 代替 bezier）

**效果不显示：**
- 检查 `isDead()` 逻辑
- 确认 `alpha` 已初始化
- 确保 `draw()` 使用正确的 alpha

**移动感觉不对：**
- 调整 `handVelocityScale`
- 调整 `velocitySmoothing`
- 检查 `spawnRate` 和 `burstRate`

**摄像头无法启动：**
- 检查浏览器权限设置
- 确认使用 HTTPS（摄像头需要安全上下文）
- 尝试刷新页面重新授权
