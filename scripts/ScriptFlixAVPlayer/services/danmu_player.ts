import type { DanmuConfig } from '../types'

type BuildPlayerHtmlOptions = {
  videoUrl: string
  config: DanmuConfig
}

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const buildDanmuPlayerHtml = ({ videoUrl, config }: BuildPlayerHtmlOptions) => {
  const safeUrl = escapeHtml(videoUrl)
  const initialConfig = {
    opacity: config.opacity,
    fontSize: config.fontSize,
    modes: config.modes
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <style>
    :root {
      --danmu-opacity: ${initialConfig.opacity};
      --danmu-font-size: ${initialConfig.fontSize}px;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #000;
      height: 100%;
      overflow: hidden;
    }
    #wrap {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000;
    }
    video {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: #000;
      object-fit: contain;
      z-index: 1;
    }
    #danmu {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      overflow: hidden;
      opacity: var(--danmu-opacity);
      font-size: var(--danmu-font-size);
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      text-shadow: 0 1px 2px rgba(0,0,0,0.9);
      z-index: 2;
    }
    .d {
      position: absolute;
      white-space: nowrap;
      will-change: transform;
    }

    /* 尝试隐藏原生全屏按钮：iOS 全屏播放会脱离 DOM，弹幕层无法覆盖 */
    video::-webkit-media-controls-fullscreen-button { display: none !important; }
    video::-webkit-media-controls-fullscreen-button * { display: none !important; }
    video::-webkit-media-controls-enclosure { overflow: hidden !important; }
  </style>
</head>
<body>
  <div id="wrap">
    <video id="v" src="${safeUrl}" controls playsinline webkit-playsinline></video>
    <div id="danmu"></div>
  </div>

  <script>
    (function() {
      const config = ${JSON.stringify(initialConfig)};
      const video = document.getElementById('v');
      const layer = document.getElementById('danmu');

      let danmu = [];
      let index = 0;
      let raf = 0;

      const lanes = { scroll: [], top: [], bottom: [] };

      const laneCount = () => {
        const h = layer.clientHeight || 240;
        const line = Math.max(16, (config.fontSize || 16) + 6);
        return Math.max(1, Math.floor(h / line));
      };

      const pickLane = (kind) => {
        const count = laneCount();
        if (!lanes[kind] || lanes[kind].length !== count) {
          lanes[kind] = Array.from({ length: count }, () => 0);
        }
        let best = 0;
        for (let i = 1; i < count; i++) {
          if (lanes[kind][i] < lanes[kind][best]) best = i;
        }
        lanes[kind][best] = Date.now();
        return best;
      };

      const getModeKind = (m) => {
        // 1/2/3: scroll, 4: bottom, 5: top (bilibili-style)
        if (m === 4) return 'bottom';
        if (m === 5) return 'top';
        return 'scroll';
      };

      const animateScroll = (el) => {
        // 让滚动弹幕从屏幕右侧进入、左侧退出，避免使用 % transform 导致“显示不完整”
        const w = layer.clientWidth || 320;
        // 先挂载一次以获得真实宽度
        const elW = el.getBoundingClientRect().width || 80;
        const fromX = w + 8;
        const toX = -elW - 16;
        try {
          const anim = el.animate(
            [{ transform: 'translateX(' + fromX + 'px)' }, { transform: 'translateX(' + toX + 'px)' }],
            { duration: 8000, easing: 'linear', fill: 'forwards' }
          );
          anim.onfinish = () => el.remove();
        } catch (e) {
          // 兜底：无法动画则 8s 后移除
          setTimeout(() => el.remove(), 8000);
        }
      };

      const emit = (item) => {
        const kind = getModeKind(item.mode);
        if (!config.modes || !config.modes[kind]) return;

        const el = document.createElement('div');
        el.className = 'd';
        el.textContent = item.text;
        el.style.color = item.color || '#fff';
        const line = Math.max(16, (config.fontSize || 16) + 6);
        const lane = pickLane(kind);

        if (kind === 'scroll') {
          el.style.top = (lane * line) + 'px';
          el.style.left = '0px';
          layer.appendChild(el);
          animateScroll(el);
          return;
        } else if (kind === 'top') {
          el.style.top = (lane * line) + 'px';
          el.style.left = '50%';
          el.style.transform = 'translateX(-50%)';
          setTimeout(() => el.remove(), 3000);
        } else {
          const h = layer.clientHeight || 240;
          el.style.top = (h - (lane + 1) * line) + 'px';
          el.style.left = '50%';
          el.style.transform = 'translateX(-50%)';
          setTimeout(() => el.remove(), 3000);
        }

        layer.appendChild(el);
      };

      const tick = () => {
        const t = video.currentTime || 0;
        while (index < danmu.length && danmu[index].time <= t) {
          emit(danmu[index]);
          index++;
        }
        raf = requestAnimationFrame(tick);
      };

      window.setDanmuConfig = (next) => {
        try {
          config.opacity = next.opacity ?? config.opacity;
          config.fontSize = next.fontSize ?? config.fontSize;
          config.modes = next.modes ?? config.modes;
          document.documentElement.style.setProperty('--danmu-opacity', String(config.opacity));
          document.documentElement.style.setProperty('--danmu-font-size', String(config.fontSize) + 'px');
        } catch (e) {}
      };

      window.setDanmuItems = (items) => {
        danmu = Array.isArray(items) ? items.slice().sort((a,b) => a.time - b.time) : [];
        index = 0;
        layer.innerHTML = '';
      };

      video.addEventListener('play', () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      });
      video.addEventListener('pause', () => cancelAnimationFrame(raf));
      video.addEventListener('seeking', () => {
        const t = video.currentTime || 0;
        let lo = 0, hi = danmu.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (danmu[mid].time < t) lo = mid + 1; else hi = mid;
        }
        index = lo;
        layer.innerHTML = '';
      });

      window.addEventListener('resize', () => {
        // 横竖屏切换时清空在屏幕外的残留，避免“看起来不完整”
        try { layer.innerHTML = ''; } catch (e) {}
      });

      // Apply initial config
      window.setDanmuConfig(config);
    })();
  </script>
</body>
</html>`;
}

type BuildOverlayHtmlOptions = {
  config: DanmuConfig
}

/**
 * 仅渲染弹幕层的 HTML（不包含 <video>），用于配合 Scripting 的 <VideoPlayer overlay>。
 * 通过 window.setDanmuConfig / window.setDanmuItems / window.tick(currentTimeSeconds) 驱动弹幕播放。
 */
export const buildDanmuOverlayHtml = ({ config }: BuildOverlayHtmlOptions) => {
  const initialConfig = {
    opacity: config.opacity,
    fontSize: config.fontSize,
    modes: config.modes
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <style>
    :root {
      --danmu-opacity: ${initialConfig.opacity};
      --danmu-font-size: ${initialConfig.fontSize}px;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
    }
    #danmu {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      overflow: hidden;
      opacity: var(--danmu-opacity);
      font-size: var(--danmu-font-size);
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      text-shadow: 0 1px 2px rgba(0,0,0,0.9);
    }
    .d {
      position: absolute;
      white-space: nowrap;
      will-change: transform;
    }
  </style>
</head>
<body>
  <div id="danmu"></div>

  <script>
    (function() {
      const config = ${JSON.stringify(initialConfig)};
      const layer = document.getElementById('danmu');

      let danmu = [];
      let index = 0;
      let lastTime = 0;

      const lanes = { scroll: [], top: [], bottom: [] };

      const laneCount = () => {
        const h = layer.clientHeight || 240;
        const line = Math.max(16, (config.fontSize || 16) + 6);
        return Math.max(1, Math.floor(h / line));
      };

      const pickLane = (kind) => {
        const count = laneCount();
        if (!lanes[kind] || lanes[kind].length !== count) {
          lanes[kind] = Array.from({ length: count }, () => 0);
        }
        let best = 0;
        for (let i = 1; i < count; i++) {
          if (lanes[kind][i] < lanes[kind][best]) best = i;
        }
        lanes[kind][best] = Date.now();
        return best;
      };

      const getModeKind = (m) => {
        // 1/2/3: scroll, 4: bottom, 5: top (bilibili-style)
        if (m === 4) return 'bottom';
        if (m === 5) return 'top';
        return 'scroll';
      };

      const animateScroll = (el) => {
        const w = layer.clientWidth || 320;
        const elW = el.getBoundingClientRect().width || 80;
        const fromX = w + 8;
        const toX = -elW - 16;
        try {
          const anim = el.animate(
            [{ transform: 'translateX(' + fromX + 'px)' }, { transform: 'translateX(' + toX + 'px)' }],
            { duration: 8000, easing: 'linear', fill: 'forwards' }
          );
          anim.onfinish = () => el.remove();
        } catch (e) {
          setTimeout(() => el.remove(), 8000);
        }
      };

      const emit = (item) => {
        const kind = getModeKind(item.mode);
        if (!config.modes || !config.modes[kind]) return;

        const el = document.createElement('div');
        el.className = 'd';
        el.textContent = item.text;
        el.style.color = item.color || '#fff';
        const line = Math.max(16, (config.fontSize || 16) + 6);
        const lane = pickLane(kind);

        if (kind === 'scroll') {
          el.style.top = (lane * line) + 'px';
          el.style.left = '0px';
          layer.appendChild(el);
          animateScroll(el);
          return;
        }

        if (kind === 'top') {
          el.style.top = (lane * line) + 'px';
        } else {
          const h = layer.clientHeight || 240;
          el.style.top = (h - (lane + 1) * line) + 'px';
        }

        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        layer.appendChild(el);
        setTimeout(() => el.remove(), 3000);
      };

      const seekIndex = (t) => {
        let lo = 0, hi = danmu.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (danmu[mid].time < t) lo = mid + 1; else hi = mid;
        }
        return lo;
      };

      window.setDanmuConfig = (next) => {
        try {
          config.opacity = next.opacity ?? config.opacity;
          config.fontSize = next.fontSize ?? config.fontSize;
          config.modes = next.modes ?? config.modes;
          document.documentElement.style.setProperty('--danmu-opacity', String(config.opacity));
          document.documentElement.style.setProperty('--danmu-font-size', String(config.fontSize) + 'px');
          layer.innerHTML = '';
        } catch (e) {}
      };

      window.setDanmuItems = (items) => {
        danmu = Array.isArray(items) ? items.slice().sort((a,b) => a.time - b.time) : [];
        index = 0;
        lastTime = 0;
        layer.innerHTML = '';
      };

      window.tick = (t) => {
        const time = Number(t || 0);
        if (!Number.isFinite(time)) return;

        if (time + 0.2 < lastTime) {
          index = seekIndex(time);
          layer.innerHTML = '';
        }
        lastTime = time;

        while (index < danmu.length && danmu[index].time <= time) {
          emit(danmu[index]);
          index++;
        }
      };

      window.addEventListener('resize', () => {
        try { layer.innerHTML = ''; } catch (e) {}
      });

      window.setDanmuConfig(config);
    })();
  </script>
</body>
</html>`;
}
