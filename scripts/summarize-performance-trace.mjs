import fs from 'node:fs/promises'
const events = JSON.parse(await fs.readFile(process.argv[2], 'utf8')).traceEvents
const phases = events.filter(e => e.name.startsWith('perf-phase:')).sort((a, b) => a.ts - b.ts)
const ranges = events.filter(e => e.name.startsWith('perf-range:')).map(e => {
  const [, name, offset, duration] = e.name.split(':')
  const start = e.ts + Number(offset) * 1000
  return { name, pid: e.pid, start, end: start + Number(duration) * 1000 }
})
const result = {}
for (let i = 0; i < phases.length - 1; i++) {
  const phase = phases[i].name.slice('perf-phase:'.length)
  const start = phases[i].ts, end = phases[i + 1].ts, pid = phases[i].pid
  const window = events.filter(e => e.pid === pid && e.ts >= start && e.ts < end)
  const moving = ranges.filter(r => r.pid === pid && r.start < end && r.end > start)
  const totals = result[phase] ??= { windows: 0, drawn: 0, fullyDropped: 0, partialUpdates: 0, measuredAnimationRanges: 0, fullyDroppedWhileAnimating: 0 }
  totals.windows++
  totals.measuredAnimationRanges += moving.length
  const frames = new Map()
  for (const e of window) {
    if (!['DrawFrame', 'DroppedFrame'].includes(e.name)) continue
    const key = `${e.args.layerTreeId}:${e.args.frameSeqId}`
    const frame = frames.get(key) ?? { ts: e.ts, draw: false, fullDrop: false, partial: false }
    if (e.name === 'DrawFrame') frame.draw = true
    else if (e.args.hasPartialUpdate) frame.partial = true
    else frame.fullDrop = true
    frames.set(key, frame)
  }
  for (const frame of frames.values()) {
    if (frame.draw) totals.drawn++
    if (frame.fullDrop) totals.fullyDropped++
    else if (frame.partial) totals.partialUpdates++
    if (frame.fullDrop && moving.some(r => frame.ts >= r.start && frame.ts <= r.end)) totals.fullyDroppedWhileAnimating++
  }
}
console.log(JSON.stringify(result, null, 2))
