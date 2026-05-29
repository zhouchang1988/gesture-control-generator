/**
 * GestureScene - 手势控制场景框架
 * 
 * 封装了输入管理（鼠标/手势自动切换）、MediaPipe 手势检测、p5.js 渲染循环。
 * 用户只需要提供一个"物体工厂函数"，返回的对象实现 update()、draw()、isDead() 三个方法。
 * 
 * @example
 * const scene = new GestureScene({
 *   create: (x, y, vx, vy) => ({
 *     x, y, vx, vy, alpha: 100,
 *     update() { this.x += this.vx; this.y += this.vy; this.alpha -= 1; },
 *     draw() { fill(255, this.alpha); ellipse(this.x, this.y, 10); },
 *     isDead() { return this.alpha <= 0; }
 *   })
 * });
 */

class GestureScene {
  /**
   * @param {Object} config
   * @param {Function} config.create - 物体工厂函数 (x, y, vx, vy) => object
   * @param {number} [config.spawnRate=3] - 每帧生成数量
   * @param {number} [config.burstRate=14] - 鼠标按下/快速移动时的爆发数量
   * @param {number} [config.maxObjects=4000] - 物体上限
   * @param {number[]} [config.background=[0,0,3,16]] - 背景色（每帧覆盖的透明度）
   * @param {string} [config.colorMode='hsb'] - 颜色模式 'hsb' 或 'rgb'
   * @param {number[]} [config.colorModeRange] - HSB: [360,100,100,100] RGB: [255,255,255,255]
   * @param {number} [config.handVelocityScale=1.8] - 手势速度缩放
   * @param {number} [config.handCooldownMs=500] - 手消失后的冷却时间
   * @param {string} [config.title='手势控制'] - 页面标题
   */
  constructor(config) {
    this.config = {
      create: config.create,
      spawnRate: config.spawnRate ?? 3,
      burstRate: config.burstRate ?? 14,
      maxObjects: config.maxObjects ?? 4000,
      background: config.background ?? [0, 0, 3, 16],
      colorMode: config.colorMode ?? 'hsb',
      colorModeRange: config.colorModeRange ?? (config.colorMode === 'rgb' ? [255, 255, 255, 255] : [360, 100, 100, 100]),
      handVelocityScale: config.handVelocityScale ?? 1.8,
      handCooldownMs: config.handCooldownMs ?? 500,
      title: config.title ?? '手势控制',
      velocitySmoothing: config.velocitySmoothing ?? 0.6,
      minMoveDist: config.minMoveDist ?? 1.5,
    };

    // 状态
    this.objects = [];
    this.pmx = 0;
    this.pmy = 0;
    this.smvx = 0;
    this.smvy = 0;
    this.handDetected = false;
    this.handX = 0;
    this.handY = 0;
    this.lastHandTime = 0;
    this.cursorX = 0;
    this.cursorY = 0;
    this.inputMode = 'mouse';
    this.camActive = false;

    // MediaPipe
    this.mpHands = null;
    this.mpCamera = null;

    // UI 元素
    this.statusEl = null;
    this.camToggleEl = null;
    this.camPreviewEl = null;

    // p5 实例
    this.p5Instance = null;

    this._init();
  }

  _init() {
    this._createUI();

    this._loadDependencies()
      .then(() => {
        this._initP5();
      })
      .catch((error) => {
        console.error('依赖加载失败:', error);
        this.statusEl.textContent = '加载失败，请刷新页面重试';
      });
  }

  _createUI() {
    // 样式
    const style = document.createElement('style');
    style.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #08080c; overflow: hidden; }
      canvas { display: block; cursor: none; }
      #cam-preview {
        position: fixed;
        bottom: 16px;
        right: 16px;
        width: 200px;
        border-radius: 10px;
        border: 2px solid rgba(255,255,255,0.15);
        z-index: 10;
        transform: scaleX(-1);
        display: none;
      }
      #cam-preview.active { display: block; }
      #status {
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255,255,255,0.5);
        font-family: system-ui, sans-serif;
        font-size: 14px;
        z-index: 10;
        pointer-events: none;
        transition: opacity 0.5s;
        white-space: nowrap;
      }
      #cam-toggle {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 20;
        padding: 8px 18px;
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 8px;
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.7);
        font-family: system-ui, sans-serif;
        font-size: 14px;
        cursor: pointer;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: all 0.2s;
        display: none;
      }
      #cam-toggle:hover {
        background: rgba(255,255,255,0.15);
        color: #fff;
      }
      #cam-toggle.on {
        border-color: rgba(100,220,255,0.5);
        color: rgba(100,220,255,0.9);
      }
    `;
    document.head.appendChild(style);

    // 标题
    document.title = this.config.title;

    // 摄像头预览
    this.camPreviewEl = document.createElement('video');
    this.camPreviewEl.id = 'cam-preview';
    this.camPreviewEl.autoplay = true;
    this.camPreviewEl.playsInline = true;
    this.camPreviewEl.muted = true;
    document.body.appendChild(this.camPreviewEl);

    // 摄像头切换按钮
    this.camToggleEl = document.createElement('button');
    this.camToggleEl.id = 'cam-toggle';
    this.camToggleEl.textContent = '关闭摄像头';
    this.camToggleEl.addEventListener('click', () => this.toggleCamera());
    document.body.appendChild(this.camToggleEl);

    // 状态提示
    this.statusEl = document.createElement('div');
    this.statusEl.id = 'status';
    this.statusEl.textContent = '正在加载…';
    document.body.appendChild(this.statusEl);
  }

  async _loadDependencies() {
    if (typeof p5 === 'undefined') {
      await this._loadScript('https://cdn.jsdelivr.net/npm/p5@1.9.4/lib/p5.min.js');
    }

    if (typeof Hands === 'undefined') {
      await this._loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js');
    }
    if (typeof Camera === 'undefined') {
      await this._loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js');
    }
  }

  _loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  _initP5() {
    const self = this;

    new p5((p) => {
      self.p5Instance = p;

      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        if (self.config.colorMode === 'hsb') {
          p.colorMode(p.HSB, ...self.config.colorModeRange);
        } else {
          p.colorMode(p.RGB, ...self.config.colorModeRange);
        }

        self.pmx = p.width / 2;
        self.pmy = p.height / 2;
        self.handX = p.width / 2;
        self.handY = p.height / 2;
        self.cursorX = p.width / 2;
        self.cursorY = p.height / 2;

        // 绑定 p5 全局函数到 window，让用户代码可以使用 random(), fill() 等
        // 必须在 setup 中调用，此时 p5Instance 已经初始化完成
        self._bindP5Globals();

        self.statusEl.textContent = '鼠标控制中 · 请伸出食指';

        self._tryStartCamera();
      };

      p.draw = () => {
        p.noStroke();
        p.fill(...self.config.background);
        p.rect(0, 0, p.width, p.height);

        self._updateInputMode();
        self._updateStatus();
        self._updateVelocity(p);
        self._spawnObjects(p);

        self.pmx = self.cursorX;
        self.pmy = self.cursorY;

        for (let i = self.objects.length - 1; i >= 0; i--) {
          const obj = self.objects[i];
          obj.update();
          obj.draw();
          if (obj.isDead()) {
            self.objects.splice(i, 1);
          }
        }

        if (self.objects.length > self.config.maxObjects) {
          self.objects.splice(0, self.objects.length - self.config.maxObjects);
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        p.background(...self.config.background.slice(0, 3));
      };
    });
  }

  _bindP5Globals() {
    const p = this.p5Instance;
    const globals = [
      'random', 'fill', 'stroke', 'noStroke', 'noFill', 'strokeWeight',
      'ellipse', 'rect', 'line', 'point', 'arc', 'triangle', 'quad',
      'beginShape', 'endShape', 'vertex', 'bezierVertex', 'curveVertex', 'bezier',
      'push', 'pop', 'translate', 'rotate', 'scale', 'shearX', 'shearY',
      'colorMode', 'background', 'clear', 'color',
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
      'sqrt', 'pow', 'log', 'exp', 'abs', 'ceil', 'floor', 'round',
      'min', 'max', 'constrain', 'map', 'lerp', 'dist', 'norm',
      'sq', 'mag',
      'createCanvas', 'resizeCanvas', 'windowWidth', 'windowHeight', 'width', 'height',
      'mouseX', 'mouseY', 'pmouseX', 'pmouseY', 'mouseIsPressed',
      'keyCode', 'key', 'keyIsPressed',
      'frameCount', 'frameRate', 'deltaTime', 'millis',
      'PI', 'TWO_PI', 'HALF_PI', 'QUARTER_PI',
      'CENTER', 'RADIUS', 'CORNER', 'CORNERS',
      'OPEN', 'CLOSE', 'CHORD', 'PIE',
      'POINTS', 'LINES', 'TRIANGLES', 'TRIANGLE_FAN', 'TRIANGLE_STRIP', 'QUADS', 'QUAD_STRIP',
      'HSB', 'RGB',
      'TEXTURE', 'IMAGE',
      'CLAMP', 'MIRROR', 'REPEAT',
      'NORMAL', 'ITALIC', 'BOLD', 'BOLDITALIC',
      'LEFT', 'RIGHT', 'TOP', 'BOTTOM', 'BASELINE',
      'ARROW', 'CROSS', 'HAND', 'MOVE', 'TEXT', 'WAIT',
    ];

    globals.forEach(name => {
      if (typeof p[name] === 'function') {
        window[name] = p[name].bind(p);
      } else if (p[name] !== undefined) {
        window[name] = p[name];
      }
    });
  }

  _updateInputMode() {
    const now = this.p5Instance.millis();

    if (this.handDetected && this.camActive) {
      this.inputMode = 'hand';
      this.cursorX = this.handX;
      this.cursorY = this.handY;
    } else if (this.camActive && (now - this.lastHandTime) < this.config.handCooldownMs) {
      this.inputMode = 'hand';
      this.cursorX = this.handX;
      this.cursorY = this.handY;
    } else {
      this.inputMode = 'mouse';
      this.cursorX = this.p5Instance.mouseX;
      this.cursorY = this.p5Instance.mouseY;
    }
  }

  _updateStatus() {
    if (this.camActive) {
      if (this.inputMode === 'hand') {
        this.statusEl.textContent = '✋ 手势控制中';
        this.statusEl.style.color = 'rgba(100,220,255,0.7)';
      } else {
        this.statusEl.textContent = '🖱 鼠标控制中 · 请伸出食指';
        this.statusEl.style.color = 'rgba(255,255,255,0.5)';
      }
    }
    this.statusEl.style.opacity = '1';
  }

  _updateVelocity(p) {
    let rawVx = this.cursorX - this.pmx;
    let rawVy = this.cursorY - this.pmy;

    if (this.inputMode === 'hand') {
      const d = Math.sqrt(rawVx * rawVx + rawVy * rawVy);
      if (d < this.config.minMoveDist) {
        rawVx = 0;
        rawVy = 0;
      }
      this.smvx = this.smvx * (1 - this.config.velocitySmoothing) + rawVx * this.config.velocitySmoothing;
      this.smvy = this.smvy * (1 - this.config.velocitySmoothing) + rawVy * this.config.velocitySmoothing;
    } else {
      this.smvx = rawVx;
      this.smvy = rawVy;
    }
  }

  _spawnObjects(p) {
    const vx = this.inputMode === 'hand' ? this.smvx * this.config.handVelocityScale : this.smvx;
    const vy = this.inputMode === 'hand' ? this.smvy * this.config.handVelocityScale : this.smvy;

    const hasMotion = this.inputMode === 'hand'
      ? (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5)
      : (vx !== 0 || vy !== 0);

    if (hasMotion) {
      let rate = this.config.spawnRate;
      if (this.inputMode === 'mouse' && p.mouseIsPressed) {
        rate = this.config.burstRate;
      }
      if (this.inputMode === 'hand') {
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > 5) rate = this.config.burstRate;
      }

      for (let i = 0; i < rate; i++) {
        const t = rate > 1 ? i / (rate - 1) : 0.5;
        const px = p.lerp(this.pmx, this.cursorX, t);
        const py = p.lerp(this.pmy, this.cursorY, t);
        this.objects.push(this.config.create(px, py, vx, vy));
      }
    }
  }

  // 公开方法

  /**
   * 切换摄像头状态
   */
  async toggleCamera() {
    if (this.camActive) {
      this.stopCamera();
    } else {
      await this.startCamera();
    }
  }

  /**
   * 启动摄像头
   */
  async startCamera() {
    this.statusEl.textContent = '正在加载手势模型…';

    try {
      this.mpHands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      });

      this.mpHands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.4,
      });

      this.mpHands.onResults((results) => this._onHandResults(results));

      this.statusEl.textContent = '正在启动摄像头…';

      this.mpCamera = new Camera(this.camPreviewEl, {
        onFrame: async () => {
          await this.mpHands.send({ image: this.camPreviewEl });
        },
        width: 640,
        height: 480,
      });

      await this.mpCamera.start();

      this.camActive = true;
      this.camPreviewEl.classList.add('active');
      this.camToggleEl.style.display = 'block';
      this.camToggleEl.textContent = '关闭摄像头';
      this.camToggleEl.classList.add('on');
      this.statusEl.textContent = '鼠标控制中 · 请伸出食指';
    } catch (error) {
      console.warn('摄像头启动失败:', error);
      this._handleCameraError(error);
    }
  }

  _handleCameraError(error) {
    let message = '鼠标控制中（摄像头不可用）';
    if (error.name === 'NotAllowedError' || 
        (error.message && error.message.includes('Permission denied'))) {
      message = '鼠标控制中（摄像头权限被拒绝）';
    } else if (error.name === 'NotFoundError' || 
               (error.message && error.message.includes('Requested device not found'))) {
      message = '鼠标控制中（未找到摄像头设备）';
    } else if (error.name === 'NotReadableError' || 
               (error.message && error.message.includes('Could not start video source'))) {
      message = '鼠标控制中（摄像头被占用）';
    }
    
    this.statusEl.textContent = message;
    this.camActive = false;
    this.inputMode = 'mouse';
    
    if (this.p5Instance) {
      this.cursorX = this.p5Instance.mouseX;
      this.cursorY = this.p5Instance.mouseY;
    }
  }

  async _tryStartCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.statusEl.textContent = '鼠标控制中（浏览器不支持摄像头）';
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      await this.startCamera();
    } catch (error) {
      console.warn('摄像头权限检测失败:', error);
      this._handleCameraError(error);
    }
  }

  /**
   * 停止摄像头
   */
  stopCamera() {
    if (this.mpCamera) {
      this.mpCamera.stop();
      this.mpCamera = null;
    }

    this.camPreviewEl.srcObject = null;
    this.camPreviewEl.classList.remove('active');
    this.camActive = false;
    this.handDetected = false;

    this.camToggleEl.textContent = '开启摄像头';
    this.camToggleEl.classList.remove('on');
    this.statusEl.style.opacity = '1';
    this.statusEl.textContent = '鼠标控制中 · 请伸出食指';
  }

  _onHandResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const tip = results.multiHandLandmarks[0][8];
      this.handX = (1 - tip.x) * this.p5Instance.width;
      this.handY = tip.y * this.p5Instance.height;
      this.lastHandTime = this.p5Instance.millis();

      if (!this.handDetected) {
        this.handDetected = true;
        this.pmx = this.handX;
        this.pmy = this.handY;
      }
    } else {
      this.handDetected = false;
    }
  }
}
