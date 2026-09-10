export const DRAGON_TURN_SECONDS = 8

import { MathUtils, Quaternion, Vector3 } from 'three'

// Motion is independent of rendering, so input sampling and the return to the
// front view behave the same on a small phone canvas and a fast desktop GPU.
export class DragonMotion {
  constructor(quaternion, reduced = false) {
    this.quaternion = quaternion
    this.reduced = reduced
    this.mode = reduced ? 'rest' : 'auto'
    this.time = 0
    this.velocity = new Vector3()
    this.samples = []
    this.dragTravel = 0
    this.friction = .32
    this.delta = new Quaternion()
    this.from = new Quaternion()
    this.center = new Quaternion()
    this.yAxis = new Vector3(0, 1, 0)
  }
  joinLoop(seconds) {
    if (this.mode !== 'auto' || this.reduced) return
    this.time = 1
    this.quaternion.setFromAxisAngle(this.yAxis, seconds % DRAGON_TURN_SECONDS / DRAGON_TURN_SECONDS * Math.PI * 2)
  }
  beginDrag() {
    this.mode = 'drag'; this.time = 0; this.velocity.set(0, 0, 0)
    this.samples.length = 0
    this.dragTravel = 0
  }
  drag(delta, seconds) {
    this.quaternion.premultiply(delta).normalize()
    const angle = 2 * Math.acos(MathUtils.clamp(delta.w, -1, 1))
    // Browsers can send a final move at the same position. It must not erase
    // the velocity of the flick immediately before it.
    if (angle < .00001) return false
    this.dragTravel += angle
    // Average angular travel over the last 100 ms, rather than weighting the
    // last hardware event most heavily. Tiny movements while lifting a finger
    // otherwise erase a flick, especially on high-polling-rate mice.
    if (seconds > .1) this.samples.length = 0
    const duration = MathUtils.clamp(seconds, .001, .064)
    const travel = new Vector3(delta.x, delta.y, delta.z).normalize().multiplyScalar(angle)
    this.samples.push({ travel, duration })
    let total = this.samples.reduce((sum, sample) => sum + sample.duration, 0)
    while (total - this.samples[0].duration >= .1) total -= this.samples.shift().duration
    if (total > .1) {
      const first = this.samples[0], keep = first.duration - (total - .1)
      first.travel.multiplyScalar(keep / first.duration)
      first.duration = keep
      total = .1
    }
    this.velocity.set(0, 0, 0)
    for (const sample of this.samples) this.velocity.add(sample.travel)
    this.velocity.divideScalar(total).clampLength(0, 48)
    return true
  }
  release(cancelled = false) {
    // The gesture stores the spin until release, even if the user holds briefly.
    // Grabbing without moving still stops, since beginDrag clears the energy.
    if (cancelled) this.velocity.set(0, 0, 0)
    if (this.reduced) {
      this.quaternion.identity(); this.velocity.set(0, 0, 0); this.mode = 'rest'
    } else if (this.velocity.length() > .1) {
      // A flick adds energy; friction, rather than a timer, decides when it ends.
      this.velocity.multiplyScalar(1.4).clampLength(0, Math.min(60, this.dragTravel * 40))
      // A few pixels must not become a long spin just because the input events
      // were close together. Small nudges settle quickly; large throws coast.
      this.friction = MathUtils.lerp(2.4, .32, MathUtils.smoothstep(this.velocity.length(), 4, 24))
      this.mode = 'coast'; this.time = 0
    } else this.returnToCenter()
  }
  returnToCenter() {
    this.velocity.set(0, 0, 0)
    this.from.copy(this.quaternion)
    this.time = 0
    this.mode = this.reduced ? 'rest' : 'return'
    if (this.reduced) this.quaternion.identity()
  }
  advance(dt) {
    this.time += dt
    if (this.mode === 'coast') {
      const speed = this.velocity.length()
      const decay = Math.exp(-this.friction * dt)
      this.delta.setFromAxisAngle(this.velocity.clone().normalize(), speed * (1 - decay) / this.friction)
      this.quaternion.premultiply(this.delta).normalize()
      this.velocity.multiplyScalar(decay)
      if (this.velocity.length() < .3) this.returnToCenter()
    } else if (this.mode === 'return') {
      const t = Math.min(1, this.time / 1.1)
      const eased = t * t * t * (t * (t * 6 - 15) + 10)
      this.quaternion.slerpQuaternions(this.from, this.center, eased).normalize()
      if (t === 1) { this.quaternion.identity(); this.mode = 'center'; this.time = 0 }
    } else if (this.mode === 'center') {
      if (this.time >= .05) { this.mode = 'auto'; this.time = 0 }
    } else if (this.mode === 'auto') {
      const ramp = Math.min(1, this.time / .18)
      this.quaternion.premultiply(this.delta.setFromAxisAngle(this.yAxis, dt * Math.PI * 2 / DRAGON_TURN_SECONDS * ramp)).normalize()
    }
  }
  get animated() { return !['drag', 'rest'].includes(this.mode) }
}
