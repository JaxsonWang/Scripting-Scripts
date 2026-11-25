import assert from 'node:assert/strict'
import Module, { createRequire } from 'node:module'
import test from 'node:test'
import 'tsx/cjs'

const load = createRequire(import.meta.url)
const { extractForecastText, formatForecastBadge, formatForecastFooter, isForecastValid, parseForecastString, resolveForecastFromCache } =
  load('../scripts/油价小组件/utils/oil-forecast.ts')

test('真实网页 .tishi HTML 提取与解析：忽略广告 script', () => {
  const html = `
    <html><body>
      <script>var fake = '<div class="tishi">油价11月26日24时调整，预计上涨0.99元/升</div>';</script>
      <div class="tishi"> <span>油价11月26日24时调整</span><br/>
预计下调520元/吨(下跌0.39元/升-0.47元/升),大家相互转告油价又大跌了。<br/>
<script>
var tishizifu="关注最新油价，提前知道油价上涨下跌搁浅";
document.writeln("<span>油价涨跌</span>");
</script>
</div>
    </body></html>
  `

  const text = extractForecastText(html)
  assert.ok(text)
  assert.ok(!text.includes('tishizifu'))

  const parsed = parseForecastString(text, new Date('2026-11-25T03:00:00Z'))
  assert.deepEqual(parsed, {
    priceDirection: 'falling',
    forecastDate: '2026年11月26日',
    targetDate: '2026-11-26',
    forecastPrice: '0.43'
  })
})

test('HTML 变体、嵌套 div 与错误 HTML 边界', () => {
  const variantHtml = `<DIV id="notice" class='box tishi active'><span>油价11月26日24时调整</span><BR><div>预计上调&nbsp;0.10元/升</div></DIV>`
  const text = extractForecastText(variantHtml)
  assert.equal(text, '油价11月26日24时调整\n预计上调 0.10元/升')

  assert.equal(extractForecastText(`<div class="not-tishi">油价11月26日24时调整，预计上涨0.10元/升</div>`), null)
  assert.equal(extractForecastText(`<div class="tishi">   </div>`), null)
  assert.equal(extractForecastText(`<html><body>403 Forbidden</body></html>`), null)
  assert.equal(extractForecastText(`<div class="tishi"><span>油价11月26日24时调整</span><div>未闭合`), null)
})

test('方向与幅度解析：单值、区间变体、无每升幅度、搁浅、非搁浅语义、前后轮与冲突', () => {
  const now = new Date('2026-11-25T03:00:00Z')

  assert.deepEqual(parseForecastString('油价11月26日24时调整，预计上涨0.10元/升', now), {
    priceDirection: 'rising',
    forecastDate: '2026年11月26日',
    targetDate: '2026-11-26',
    forecastPrice: '0.10'
  })

  assert.deepEqual(parseForecastString('油价11月26日24时调整，预计下跌 0.39 ～ 0.47 元／升', now), {
    priceDirection: 'falling',
    forecastDate: '2026年11月26日',
    targetDate: '2026-11-26',
    forecastPrice: '0.43'
  })

  assert.deepEqual(parseForecastString('油价11月26日24时调整，预计上调0.14至0.16元/升', now), {
    priceDirection: 'rising',
    forecastDate: '2026年11月26日',
    targetDate: '2026-11-26',
    forecastPrice: '0.15'
  })

  assert.deepEqual(parseForecastString('油价11月26日24时调整，预计下调520元/吨', now), {
    priceDirection: 'falling',
    forecastDate: '2026年11月26日',
    targetDate: '2026-11-26',
    forecastPrice: null
  })

  assert.deepEqual(parseForecastString('油价11月26日24时调整，预计搁浅', now), {
    priceDirection: 'stranded',
    forecastDate: '2026年11月26日',
    targetDate: '2026-11-26',
    forecastPrice: null
  })

  assert.deepEqual(parseForecastString('油价11月26日24时调整，预计上调30元/吨(约0.02元/升)，处于搁浅范围', now), {
    priceDirection: 'stranded',
    forecastDate: '2026年11月26日',
    targetDate: '2026-11-26',
    forecastPrice: null
  })

  assert.deepEqual(parseForecastString('油价11月26日24时调整，预计下调520元/吨(下跌0.39元/升-0.47元/升)，已经远离搁浅线', now), {
    priceDirection: 'falling',
    forecastDate: '2026年11月26日',
    targetDate: '2026-11-26',
    forecastPrice: '0.43'
  })

  assert.deepEqual(parseForecastString('上轮上调，本轮油价11月26日24时调整，预计下调0.12元/升', now), {
    priceDirection: 'falling',
    forecastDate: '2026年11月26日',
    targetDate: '2026-11-26',
    forecastPrice: '0.12'
  })

  assert.equal(parseForecastString('油价11月26日24时调整，本轮预计上调0.10元/升，又预计下调0.10元/升', now), null)
  assert.equal(parseForecastString('', now), null)
})

test('日期校验、跨年推断与北京时间 24 时过期边界', () => {
  assert.equal(parseForecastString('预计下调0.20元/升', new Date('2026-11-25T03:00:00Z')), null)
  assert.equal(parseForecastString('油价2月30日24时调整，预计下调0.20元/升', new Date('2026-02-20T03:00:00Z')), null)

  // 年末预测次年 1 月
  const crossYear = parseForecastString('油价1月3日24时调整，预计上涨0.10元/升', new Date('2026-12-28T03:00:00Z'))
  assert.equal(crossYear?.forecastDate, '2027年01月03日')
  assert.equal(crossYear?.targetDate, '2027-01-03')

  // 显式年份不被当前年份覆盖
  const explicit = parseForecastString('油价2027年1月3日24时调整，预计上涨0.10元/升', new Date('2026-11-25T03:00:00Z'))
  assert.equal(explicit?.forecastDate, '2027年01月03日')
  assert.equal(explicit?.targetDate, '2027-01-03')

  // 北京时间 24 时过期边界：26日23:59:59有效，27日00:00:00过期
  assert.equal(isForecastValid({ targetDate: '2026-11-26' }, new Date('2026-11-26T15:59:59Z')), true)
  assert.equal(isForecastValid({ targetDate: '2026-11-26' }, new Date('2026-11-26T16:00:00Z')), false)

  // 年初读取已确定的上年 12 月缓存：已过期则退回 unknown
  const staleCache = resolveForecastFromCache(
    {
      priceDirection: 'rising',
      forecastDate: '2026年12月28日',
      targetDate: '2026-12-28',
      forecastPrice: '0.15',
      fetchedAt: Date.parse('2026-12-25T00:00:00Z')
    },
    new Date('2027-01-02T03:00:00Z')
  )
  assert.equal(staleCache.priceDirection, 'unknown')
  assert.equal(staleCache.forecastDate, null)
})

test('展示文案覆盖四种状态保持一致', () => {
  assert.equal(formatForecastBadge({ priceDirection: 'falling', forecastDate: '2026年11月26日', forecastPrice: '0.43' }), '↘ 约¥0.43/L')
  assert.equal(formatForecastBadge({ priceDirection: 'rising', forecastDate: '2026年11月26日', forecastPrice: null }), '↗ 预计上调')
  assert.equal(formatForecastBadge({ priceDirection: 'stranded', forecastDate: '2026年11月26日', forecastPrice: null }), '→ 预计不调整')
  assert.equal(formatForecastBadge({ priceDirection: 'unknown', forecastDate: null, forecastPrice: null }), null)

  assert.equal(formatForecastFooter({ priceDirection: 'falling', forecastDate: '2026年11月26日', forecastPrice: '0.43' }), '2026年11月26日 预计下调')
  assert.equal(formatForecastFooter({ priceDirection: 'stranded', forecastDate: '2026年11月26日', forecastPrice: null }), '2026年11月26日 预计不调整')
  assert.equal(formatForecastFooter({ priceDirection: 'unknown', forecastDate: null, forecastPrice: null }), '预测暂不可用')
})

test('服务层：预测坏响应不覆盖好缓存、跨省故障不串用油价、乱序请求不覆写新地区元数据', async t => {
  const store = new Map()
  globalThis.Storage = {
    get: key => store.get(key),
    set: (key, value) => store.set(key, value)
  }

  let fetchImpl = async () => {
    throw new Error('not mocked')
  }

  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === 'scripting') {
      return {
        Script: { directory: '/tmp' },
        fetch: (...args) => fetchImpl(...args)
      }
    }
    return originalLoad.apply(this, arguments)
  }

  t.after(() => {
    Module._load = originalLoad
    delete globalThis.Storage
  })

  const servicePath = load.resolve('../scripts/油价小组件/utils/oil-price-service.ts')
  delete load.cache[servicePath]
  const service = load(servicePath)

  // 1. 预测先成功、再遇到 403/坏页面，应保留好缓存；无缓存时返回 unknown
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  const shifted = new Date(futureDate.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth() + 1
  const d = shifted.getUTCDate()
  const expectedDisplay = `${y}年${String(m).padStart(2, '0')}月${String(d).padStart(2, '0')}日`

  fetchImpl = async () => ({ ok: false, status: 500, text: async () => '' })
  const initialFail = await service.fetchForecastData()
  assert.equal(initialFail.priceDirection, 'unknown')

  fetchImpl = async () => ({
    ok: true,
    status: 200,
    text: async () => `<div class="tishi">油价${y}年${m}月${d}日24时调整<br/>预计下调(下跌0.39元/升-0.47元/升)</div>`
  })
  const goodForecast = await service.fetchForecastData()
  assert.equal(goodForecast.priceDirection, 'falling')
  assert.equal(goodForecast.forecastDate, expectedDisplay)
  assert.equal(goodForecast.forecastPrice, '0.43')

  fetchImpl = async () => ({ ok: true, status: 200, text: async () => '<html>403 验证页</html>' })
  const fallbackForecast = await service.fetchForecastData()
  assert.deepEqual(fallbackForecast, goodForecast)

  // 2. 跨省故障不串用江苏价格
  const makeProvinceResponse = (provinceName, price92) => ({
    data: {
      provinceCheck: { PROVINCE_NAME: provinceName, GAS_92: 'Y' },
      provinceData: { GAS_92: price92, START_DATE: '2026-11-20' }
    }
  })

  service.setArea('32', 0)
  fetchImpl = async () => ({ ok: true, status: 200, json: async () => makeProvinceResponse('江苏', 7.55) })
  const jsData = await service.fetchOilPriceData()
  assert.equal(jsData.region, '江苏')
  assert.equal(jsData.prices.length, 1)

  service.setArea('11', 0)
  fetchImpl = async () => {
    throw new Error('network down')
  }
  const bjFailData = await service.fetchOilPriceData()
  assert.equal(bjFailData.region, '北京')
  assert.deepEqual(bjFailData.prices, [])
  assert.equal(bjFailData.lastUpdated, '暂未获取')

  // 3. 乱序 getAreaMetadata：慢请求（上海 31）晚于新地区（广东 44）返回，不得覆盖广东缓存
  let resolveSlow
  const slowPromise = new Promise(resolve => {
    resolveSlow = resolve
  })

  service.setArea('31', 0)
  fetchImpl = async (_url, init) => {
    const { provinceId } = JSON.parse(init.body)
    if (provinceId === '31') {
      await slowPromise
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            provinceCheck: { PROVINCE_NAME: '上海', GAS_92: 'Y' },
            provinceData: { GAS_92: 7.4 }
          }
        })
      }
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          provinceCheck: { PROVINCE_NAME: '广东', GAS_92: 'Y', GAS_95: 'Y' },
          provinceData: { GAS_92: 7.6, GAS_95: 8.2 }
        }
      })
    }
  }

  const slowReq = service.getAreaMetadata('31', 0)
  service.setArea('44', 0)
  const fastMeta = await service.getAreaMetadata('44', 0)
  assert.deepEqual(fastMeta.availableOilTypes, ['92', '95'])

  resolveSlow()
  await slowReq
  assert.deepEqual(service.getAvailableOilTypes(), ['92', '95'])
})
