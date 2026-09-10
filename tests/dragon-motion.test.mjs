import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Quaternion, Vector3 } from 'three'
import { DragonMotion } from '../src/dragon-motion.js'
const step = (motion, seconds) => { for (let i = 0; i < Math.ceil(seconds * 120); i++) motion.advance(1 / 120) }
test('a held pointer followed by a flick retains momentum through a duplicate final move', () => {
  const q = new Quaternion(), motion = new DragonMotion(q)
  motion.beginDrag()
  motion.drag(new Quaternion().setFromAxisAngle(new Vector3(1, 1, 1).normalize(), .6), 2)
  const speed = motion.velocity.length()
  motion.drag(new Quaternion(), .016)
  assert.equal(motion.velocity.length(), speed)
  motion.release(false, 20)
  const released = q.clone()
  step(motion, .2)
  assert.ok(q.angleTo(released) > .5, 'visible continuation after release')
  assert.equal(motion.mode, 'coast')
  step(motion, 2)
  assert.equal(motion.mode, 'coast', 'no timer cuts off an energetic spin')
  for (let i = 0; i < 2400 && motion.mode === 'coast'; i++) motion.advance(1 / 120)
  assert.equal(motion.mode, 'return')
  for (let i = 0; i < 140 && motion.mode !== 'center'; i++) motion.advance(1 / 120)
  assert.equal(motion.mode, 'center')
  assert.deepEqual(q.toArray(), [0, 0, 0, 1])
  step(motion, .7)
  assert.equal(motion.mode, 'auto')
  assert.equal(q.x, 0); assert.equal(q.z, 0)
  assert.ok(q.y > 0, 'rotation restarts only around the upright Y axis')
})
test('a new drag interrupts recentering without jumping', () => {
  const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 1)
  const motion = new DragonMotion(q)
  motion.returnToCenter(); step(motion, .4)
  const before = q.clone(); motion.beginDrag()
  assert.equal(q.angleTo(before), 0)
  motion.drag(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), .2), .02)
  assert.ok(q.angleTo(before) > .19)
})
test('cancelling does not fling; reduced motion centers without animation', () => {
  for (const [reduced, cancelled, idleMs] of [[false, true, 0], [true, false, 0]]) {
    const motion = new DragonMotion(new Quaternion(), reduced)
    motion.beginDrag(); motion.drag(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), .5), .02)
    motion.release(cancelled, idleMs)
    assert.equal(motion.mode, reduced ? 'rest' : 'return')
    assert.equal(motion.velocity.length(), 0)
    if (reduced) assert.deepEqual(motion.quaternion.toArray(), [0, 0, 0, 1])
  }
})

test('arrival joins an already-running eight-second loop and centering restarts promptly', () => {
  const q = new Quaternion(), motion = new DragonMotion(q)
  motion.joinLoop(2)
  assert.ok(Math.abs(q.angleTo(new Quaternion()) - Math.PI / 2) < 1e-6)
  step(motion, 8)
  assert.ok(q.angleTo(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)) < 1e-6)
  motion.returnToCenter()
  step(motion, 1.1)
  step(motion, .15)
  assert.equal(motion.mode, 'auto')
  assert.ok(q.y > 0)
})

test('a strong flick completes many revolutions, slows naturally, then returns; frame rates agree', () => {
  const results = []
  for (const fps of [30, 60, 120]) {
    const q = new Quaternion(), motion = new DragonMotion(q)
    motion.beginDrag()
    motion.drag(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 1.5), .02)
    motion.release()
    let distance = 0, seconds = 0, speed = motion.velocity.length()
    while (motion.mode === 'coast' && seconds < 25) {
      const previous = q.clone()
      motion.advance(1 / fps)
      distance += previous.angleTo(q)
      assert.ok(motion.velocity.length() <= speed)
      speed = motion.velocity.length()
      seconds += 1 / fps
    }
    assert.ok(distance / (Math.PI * 2) > 20, 'strong flick carries over twenty complete turns')
    assert.ok(seconds > 12 && seconds < 20)
    assert.equal(motion.mode, 'return')
    for (let i = 0; i < fps * 2 && motion.mode !== 'center'; i++) motion.advance(1 / fps)
    assert.equal(q.angleTo(new Quaternion()), 0)
    results.push(distance)
  }
  assert.ok(Math.max(...results) - Math.min(...results) < .02, 'travel is independent of frame rate')
})
test('grabbing a fast coast stops its momentum immediately', () => {
  const q = new Quaternion(), motion = new DragonMotion(q)
  motion.beginDrag(); motion.drag(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 1), .02); motion.release()
  step(motion, 1)
  const pose = q.clone()
  motion.beginDrag(); step(motion, 1)
  assert.equal(q.angleTo(pose), 0)
  assert.equal(motion.velocity.length(), 0)
})

test('release micro-movements preserve the energy and direction of a fast flick', () => {
  const motion = new DragonMotion(new Quaternion())
  motion.beginDrag()
  const y = new Vector3(0, 1, 0)
  // A real hand accelerates, then settles a fraction of a pixel while releasing.
  for (const angle of [.15, .3, .5, .65]) motion.drag(new Quaternion().setFromAxisAngle(y, angle), .016)
  for (let i = 0; i < 6; i++) motion.drag(new Quaternion().setFromAxisAngle(y, .001), .004)
  motion.release(false, 12)
  assert.ok(motion.velocity.y > 20, 'release retains the recent fast movement, not just the final tiny move')
  const before = motion.quaternion.clone()
  motion.advance(.05)
  assert.ok(before.angleTo(motion.quaternion) > 1, 'the first released frames visibly carry momentum')
})

test('release velocity is consistent across pointer polling rates', () => {
  const speeds = []
  for (const hz of [60, 120, 500]) {
    const motion = new DragonMotion(new Quaternion())
    motion.beginDrag()
    for (let i = 0; i < hz / 5; i++) motion.drag(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 12 / hz), 1 / hz)
    motion.release()
    speeds.push(motion.velocity.y)
  }
  assert.ok(Math.max(...speeds) - Math.min(...speeds) < .001)
})
test('slowing deliberately or reversing replaces earlier flick velocity', () => {
  const motion = new DragonMotion(new Quaternion())
  const y = new Vector3(0, 1, 0)
  motion.beginDrag()
  motion.drag(new Quaternion().setFromAxisAngle(y, .7), .016)
  for (let i = 0; i < 20; i++) motion.drag(new Quaternion().setFromAxisAngle(y, .001), .01)
  assert.ok(motion.velocity.length() < .11, 'old fast samples expire')
  for (let i = 0; i < 10; i++) motion.drag(new Quaternion().setFromAxisAngle(y, -.2), .01)
  motion.release()
  assert.ok(motion.velocity.y < -20, 'spin follows the new direction')
})


test('repeated flicks tolerate the delay between movement and letting go', () => {
  const motion = new DragonMotion(new Quaternion())
  for (const idle of [20, 170, 230, 310, 400, 180, 40, 250, 340, 200]) {
    motion.beginDrag()
    for (let i = 0; i < 5; i++) motion.drag(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), .3), .016)
    motion.release(false, idle)
    assert.equal(motion.mode, 'coast', `release after ${idle} ms must carry momentum`)
    assert.ok(motion.velocity.length() > 15, `release after ${idle} ms still has visible spin`)
    motion.advance(.2)
  }
})


test('a tiny fast nudge settles quickly while a full throw keeps its energy through a hold', () => {
  const small = new DragonMotion(new Quaternion())
  small.beginDrag()
  small.drag(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), .04), .001)
  small.release()
  assert.ok(small.velocity.length() < 2)
  step(small, 1)
  assert.equal(small.mode, 'return', 'tiny nudge has already finished coasting')
  const big = new DragonMotion(new Quaternion())
  big.beginDrag()
  big.drag(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 1.5), .02)
  step(big, 2) // Holding stationary must retain the gesture, as requested.
  big.release(false, 2000)
  assert.ok(big.velocity.length() > 40)
  step(big, 3)
  assert.equal(big.mode, 'coast')
  big.beginDrag(); step(big, 1); big.release()
  assert.equal(big.mode, 'return', 'grabbing without moving still stops a spin')
})
