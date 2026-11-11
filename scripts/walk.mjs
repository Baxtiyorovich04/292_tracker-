import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

const browserPath = EDGE_CANDIDATES.find((path) => {
  try {
    return spawn ? true : false
  } catch {
    return false
  }
})

import { existsSync } from 'node:fs'
const executable = EDGE_CANDIDATES.find((path) => existsSync(path))
if (!executable) {
  console.error('No Edge or Chrome found')
  process.exit(1)
}

const outDir = join(process.cwd(), '.verify')
mkdirSync(outDir, { recursive: true })
const profile = join(tmpdir(), `292-edge-${Date.now()}`)
const port = 9223
const browser = spawn(executable, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  `--remote-debugging-port=${port}`,
  '--remote-allow-origins=*',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

const errors = []
let socket
let messageId = 0
const pending = new Map()

function send(method, params = {}) {
  const id = ++messageId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
  })
}

async function waitForPort() {
  const start = Date.now()
  while (Date.now() - start < 15000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('Browser debugging port did not open')
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text
    throw new Error(detail || JSON.stringify(result.exceptionDetails))
  }
  return result.result?.value
}

async function bodyText() {
  return evaluate(`document.body ? document.body.innerText : ''`)
}

async function waitFor(snippet, timeout = 10000) {
  const start = Date.now()
  let last = ''
  while (Date.now() - start < timeout) {
    last = await bodyText()
    if (last.toLowerCase().includes(snippet.toLowerCase())) return last
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for "${snippet}"\n---\n${last}`)
}

async function clickText(snippet) {
  const found = await evaluate(`
    (() => {
      const needle = ${JSON.stringify(snippet)}
      const el = [...document.querySelectorAll('button, a')].find((node) =>
        node.innerText.includes(needle) || (node.getAttribute('aria-label') || '').includes(needle)
      )
      if (!el) return false
      el.click()
      return true
    })()
  `)
  if (!found) throw new Error(`Could not click "${snippet}"\n${await bodyText()}`)
}

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(outDir, name), Buffer.from(data, 'base64'))
}

async function setViewport(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  })
}

try {
  await waitForPort()
  const created = await fetch(`http://127.0.0.1:${port}/json/new`, { method: 'PUT' }).then((response) => response.json())
  socket = new WebSocket(created.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve)
    socket.addEventListener('error', reject)
  })
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      pending.get(message.id).resolve(message.result)
      pending.delete(message.id)
    }
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text)
    }
  })

  await send('Page.enable')
  await send('Runtime.enable')
  await setViewport(390, 844, true)
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await waitFor('Continue on this device')
  await shot('01-welcome.png')
  await clickText('Continue on this device')
  await waitFor('Main habits')
  const before = await evaluate(`document.querySelector('.text-5xl')?.textContent?.trim()`)
  await shot('02-home.png')
  await clickText('Train')
  await new Promise((resolve) => setTimeout(resolve, 400))
  const afterOne = await evaluate(`document.querySelector('.text-5xl')?.textContent?.trim()`)
  for (const label of ['Deep work', 'Read', "Set tomorrow's plan"]) {
    await clickText(label)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  await new Promise((resolve) => setTimeout(resolve, 300))
  const afterAll = await evaluate(`document.querySelector('.text-5xl')?.textContent?.trim()`)
  const homeText = await bodyText()
  if (before !== '0') throw new Error(`Expected starting score 0, got ${before}`)
  if (afterOne !== '33') throw new Error(`Expected score 33 after one habit, got ${afterOne}`)
  if (afterAll !== '100') throw new Error(`Expected score 100, got ${afterAll}`)
  if (!homeText.includes('1 day streak')) throw new Error('Streak did not update')
  const mobileOverflow = await evaluate(`document.documentElement.scrollWidth > window.innerWidth + 1`)
  if (mobileOverflow) throw new Error('Mobile page overflows horizontally')
  await shot('03-home-done.png')

  await clickText('Plan')
  await waitFor('Main habits')
  await shot('04-plan.png')
  await clickText('Add to this day')
  await waitFor('Repeats')
  await evaluate(`
    (() => {
      const input = document.querySelector('input')
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, 'Meditate')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })()
  `)
  await clickText('Save')
  await waitFor('Meditate')

  await clickText('Wallet')
  await waitFor('This month')
  await shot('05-wallet.png')
  await clickText('Log')
  await waitFor('Amount')
  await evaluate(`
    (() => {
      const input = [...document.querySelectorAll('input')].find((node) => node.placeholder === '0')
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, '18.50')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })()
  `)
  await clickText('Save')
  await waitFor('Food')
  const walletText = await bodyText()
  if (!walletText.includes('18')) throw new Error(`Amount did not show\n${walletText}`)
  await shot('06-wallet-logged.png')

  await clickText('Rank')
  await waitFor('Amina Cole')
  await shot('07-rank.png')

  await clickText('You')
  await waitFor('Appearance')
  await clickText('Dark')
  const light = await evaluate(`document.documentElement.classList.contains('light')`)
  if (!light) throw new Error('Light mode did not apply')
  await shot('08-you-light.png')

  await setViewport(1440, 900, false)
  await clickText('Home')
  await waitFor('Discipline, measured.')
  const overflow = await evaluate(`document.documentElement.scrollWidth > window.innerWidth + 1`)
  await shot('09-desktop.png')
  if (overflow) throw new Error('Desktop page overflows horizontally')

  const manifest = await fetch('http://127.0.0.1:5173/manifest.json').then((response) => response.json())
  const worker = await fetch('http://127.0.0.1:5173/sw.js')
  if (manifest.short_name !== '292' || !manifest.shortcuts?.length) throw new Error('Manifest is incomplete')
  if (!worker.ok) throw new Error('Service worker was not served')
  if (errors.length) throw new Error(`Page errors:\n${errors.join('\n')}`)
  console.log('walk ok')
  } catch (error) {
  const lines = [String(error?.stack || error), ...errors]
  writeFileSync(join(outDir, 'log.txt'), lines.join('\n\n'))
  console.error(error)
  try {
    if (socket?.readyState === 1) await shot('error.png')
  } catch {}
  process.exitCode = 1
} finally {
  browser.kill()
}
