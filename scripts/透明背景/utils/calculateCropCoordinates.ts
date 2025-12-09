const html = `<html lang="en"><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>小组件尺寸计算</title>
  <style>.flex {
    display: flex;
  }
  body {
    font-size: 14px;
    color: #232323;
  }
  ol {
    padding-inline-start: 2em;
    line-height: 1.6;
  }
  li + li {
    margin-top: 1em;
  }
  .mockup img,
  .mockup svg {
    width: 120px;
    height: auto;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --divider-color: rgba(84,84,88,0.65);
      --card-background: #1c1c1e;
      --list-header-color: rgba(235,235,245,0.6);
    }
    body {
      background: #000;
      color: #fff;
    }
  }</style>
</head>
<body>
<main>
  <div class="flex">
    <div class="mockup">
      <img src="https://scriptore.imarkr.com/imgs/screen.png">
    </div>
    <div>
      <ol>
        <li>桌面壁纸使用不含白色的背景，可以是纯色背景</li>
        <li>长按桌面添加一屏</li>
        <li>按顺序添加此组件的中号组件和大号组件</li>
        <li>截图刚刚新建的一屏后选择截图</li>
      </ol>
    </div>
  </div>
  <input id="screenshotInput" type="file" accept="image/*" placeholder="选择屏幕截图">
  <div><samp style="color:red"></samp></div>
  <pre><code></code></pre>
</main>
<script>
  window.onerror = function(e) {
    alert('脚本运行出错，请截图并联系作者' + String(e));
  }
  const input = document.getElementById("screenshotInput");
  const pre = document.querySelector('pre');

  const appendItem = (text) => {
    const div = document.createElement('div')
    div.innerText = text
    pre.appendChild(div)
    return div
  }

  var resolve, reject;

  var promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  input.onchange = (e) => {
    const file = e.target.files[0];
    const image = new Image();
    image.onload = () => {
      const width = image.width;
      const height = image.height;
      if (!(screen.width * devicePixelRatio === width && screen.height * devicePixelRatio === height)) {
        document.querySelector('samp').innerText = '不同机型设备像素比不同，应使用截图的设备运行此脚本';
      }
      appendItem(\`屏幕分辨率：\${width}x\${height}px\`);

      let ctx;
      if (window.OffscreenCanvas) {
        ctx = new OffscreenCanvas(width, height).getContext('2d');
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
      }

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      /**
       * @param {number} index
       */
      const isWhite = (index) => {
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const a = pixels[index + 3];
        
        // iOS26 可能需要更宽松的白色检测
        const isStrictWhite = r === 255 && g === 255 && b === 255 && a === 255;
        const isNearWhite = r >= 250 && g >= 250 && b >= 250 && a >= 250;
        
        return isStrictWhite || isNearWhite; // 尝试更宽松的检测
      };

      let minX = 0;
      let maxX = width;
      const arr = [];
      const visited = new Array(width * height).fill(false);
      const dfs = (x, y) => {
        const stack = [[x, y]];
        let minX = x,
          maxX = x,
          minY = y,
          maxY = y;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          const index = (cy * width + cx) * 4;

          if (visited[cy * width + cx] || !isWhite(index)) {
            continue;
          }

          visited[cy * width + cx] = true;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const neighbors = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];
          for (const [nx, ny] of neighbors) {
            if (nx > 0 && nx < width && ny > 0 && ny < height) {
              stack.push([nx, ny]);
            }
          }
        }
        return { minX, minY, maxX, maxY };
      };

      const boxies = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const last = boxies.slice(-1)[0];
          if (last && y <= last.maxY) continue;

          const index = (y * width + x) * 4;
          if (
            isWhite(index) &&
            x > 4 &&
            x < width - 4 &&
            !visited[y * width + x]
          ) {
            const box = dfs(x, y);
            if ((box.maxX - box.minX + 1 > 64) && (box.maxY - box.minY + 1) > 64) {
              // if: 排除文字和图标
              boxies.push(box);
            }
            if (boxies.length > 1) break;
          }
        }
        if (boxies.length > 1) break;
      }

      const [mediumBox, largeBox] = boxies;

      // 添加安全检查
      if (!mediumBox || !largeBox) {
        console.error('检测到的白色区域数量:', boxies.length);
        console.error('检测到的区域:', boxies);
        
        appendItem('❌ 未能检测到足够的组件区域');
        appendItem('可能原因：');
        appendItem('1. 截图背景不是纯深色');
        appendItem('2. 组件排列方式与预期不符');
        appendItem('3. 系统版本兼容性问题');
        
        // 显示调试信息
        appendItem(\`检测到 \${boxies.length} 个区域，需要至少 2 个\`);
        
        document.querySelector('samp').innerText = 'iOS26兼容性问题：未能检测到组件区域，请使用纯深色背景重新截图';
        return;
      }

      const small = mediumBox.maxY - mediumBox.minY + 1;
      const medium = mediumBox.maxX - mediumBox.minX + 1;
      const large = largeBox.maxY - largeBox.minY + 1;
      const left = mediumBox.minX;
      const right = width - left - small;
      const top = mediumBox.minY;
      const middle = largeBox.minY;
      const bottom = top + (largeBox.minY - mediumBox.minY) * 2;

      pre.appendChild(document.createElement('br'));

      appendItem(\`小号尺寸：\${small}x\${small}px \${small / devicePixelRatio}x\${small / devicePixelRatio}pt\`)
      appendItem(\`中号尺寸：\${medium}x\${small}px \${medium / devicePixelRatio}x\${small / devicePixelRatio}pt\`)
      appendItem(\`大号尺寸：\${medium}x\${large}px \${medium / devicePixelRatio}x\${large / devicePixelRatio}pt\`)

      const dir = {
        left,
        right,
        top,
        middle,
        bottom
      }
      const size = {
        systemSmall: {width: small / 3, height: small / 3},
        systemMedium: {width: medium / 3, height: small / 3},
        systemLarge: {width: medium / 3, height: large / 3},
      }
      const widgetSize = JSON.stringify({dir, size});

      pre.appendChild(document.createElement('br'));

      const code = document.createElement('code')
      code.innerText = JSON.stringify(
        { small, medium, large, left, right, top, middle, bottom },
        null,
        4
      ).replace(/"/g, '')

      pre.appendChild(code)
      resolve(widgetSize)
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      image.src = e.target.result;
    };
    reader.readAsDataURL(file);

  };

  window.run = () => {
    return Promise.resolve(promise);
  };
</script>

</body></html>
`

export const calculateCropCoordinates = async () => {
  const web = new WebViewController()
  web.present()
  await web.loadHTML(html)
  const result = await web.evaluateJavaScript<string>('return window.run()')
  return result
}
