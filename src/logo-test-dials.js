/* DialKit-panel for /logo — justerbar indre/ytre ramme.
   DialKit har ingen vanilla-adapter (kun React/Solid/Svelte/Vue), så panelet
   monteres som en bitteliten React-øy uten JSX. Verdiene persisteres i
   localStorage (dialkit:logo-test-frame) og overlever reload. */

import { createElement as h, Fragment, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { DialRoot, useDialKit } from 'dialkit'
import 'dialkit/styles.css'

function Dials({ initial, onChange }) {
  const p = useDialKit(
    'Halo',
    {
      indreRamme: [initial.inner, 0.3, 1.5, 0.005],
      ytreRamme: [initial.outer, 0.5, 2, 0.005],
      antallKort: [initial.count, 3, 120, 1],
    },
    { id: 'logo-test-frame', persist: true },
  )

  useEffect(() => {
    onChange(p.indreRamme, p.ytreRamme, p.antallKort)
  }, [p.indreRamme, p.ytreRamme, p.antallKort, onChange])

  return null
}

export function mountDials(initial, onChange) {
  const host = document.createElement('div')
  host.id = 'dialkit-root'
  document.body.appendChild(host)
  createRoot(host).render(
    h(Fragment, null, h(Dials, { initial, onChange }), h(DialRoot)),
  )
}
