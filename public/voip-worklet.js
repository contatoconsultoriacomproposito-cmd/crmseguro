const FRAME = 320
const PREBUFFER = 1600

class VoipIO extends AudioWorkletProcessor {
  constructor() {
    super()

    this.ring = new Float32Array(16000 * 2)
    this.wr = 0
    this.rd = 0
    this.filled = 0
    this.primed = false

    this.outAccum = new Float32Array(FRAME)
    this.outLen = 0

    this.port.onmessage = event => {
      if (event.data?.kind !== 'in') {
        return
      }

      const i16 = new Int16Array(event.data.pcm)

      for (let i = 0; i < i16.length; i++) {
        this.ring[this.wr] = i16[i] / 32768
        this.wr = (this.wr + 1) % this.ring.length
        this.filled = Math.min(
          this.filled + 1,
          this.ring.length
        )
      }
    }
  }

  process(inputs, outputs) {
    const mic = inputs[0]?.[0]

    if (mic) {
      for (let i = 0; i < mic.length; i++) {
        this.outAccum[this.outLen++] = mic[i]

        if (this.outLen === FRAME) {
          const i16 = new Int16Array(FRAME)

          for (let k = 0; k < FRAME; k++) {
            let value = this.outAccum[k]

            value =
              value > 1
                ? 1
                : value < -1
                  ? -1
                  : value

            i16[k] = value * 32767
          }

          this.port.postMessage(
            {
              kind: 'out',
              pcm: i16.buffer,
            },
            [i16.buffer]
          )

          this.outLen = 0
        }
      }
    }

    const out = outputs[0][0]

    if (
      !this.primed &&
      this.filled >= PREBUFFER
    ) {
      this.primed = true
    }

    for (let i = 0; i < out.length; i++) {
      if (
        this.primed &&
        this.filled > 0
      ) {
        out[i] = this.ring[this.rd]
        this.rd =
          (this.rd + 1) % this.ring.length
        this.filled--
      } else {
        out[i] = 0

        if (
          this.primed &&
          this.filled === 0
        ) {
          this.primed = false
        }
      }
    }

    return true
  }
}

registerProcessor('voip-io', VoipIO)