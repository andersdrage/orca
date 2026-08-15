/* Variant «SPA»: About/Praise hentes og byttes inn i samme dokument, og selve
   nav-lenken FLIP-animeres med fjær-easing inn i sidetittelen. Ekte DOM hele
   veien → skarp tekst, avbrytbar midt i (klikk noe annet og den retargeter).
   Tilbake-knappen gjør full navigasjon (prototype-avgrensning). */

const SPRING = 'linear(0, 0.218 8.2%, 0.567 17.5%, 0.836 26.3%, 0.994 35%, 1.05 43.5%, 1.062 51.4%, 1.045 61%, 1.016 73.4%, 1.001 85.5%, 1)'

let activeCleanup = null

function interruptActive() {
  if (activeCleanup) {
    activeCleanup()
    activeCleanup = null
  }
}

export async function spaNavigate(link) {
  const href = new URL(link.href)
  interruptActive()

  let doc
  try {
    const response = await fetch(href.pathname)
    doc = new DOMParser().parseFromString(await response.text(), 'text/html')
  } catch {
    location.href = href.pathname
    return
  }

  const oldMain = document.querySelector('#site-layout > main')
  const newMain = doc.querySelector('#site-layout > main')
  if (!oldMain || !newMain) {
    location.href = href.pathname
    return
  }

  /* First: lenkens posisjon og stil. */
  const linkRect = link.getBoundingClientRect()

  /* Flygende klon i mål-typografi (full størrelse, skalert NED til lenken —
     rasteren er da skarp gjennom hele reisen opp). */
  const clone = document.createElement('span')
  clone.className = 'page-title spa-flip-clone'
  clone.textContent = link.textContent.trim()
  document.body.append(clone)

  link.style.visibility = 'hidden'

  /* Gammelt innhold ut. */
  const exit = oldMain.animate(
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px)' }],
    { duration: 220, easing: 'cubic-bezier(0.32, 0.08, 0.24, 1)', fill: 'forwards' },
  )
  await exit.finished.catch(() => {})

  /* DOM-bytte: main, body-klasser, tittel og aria-current. */
  oldMain.replaceWith(document.importNode(newMain, true))
  document.body.className = doc.body.className
  document.title = doc.title
  document.querySelectorAll('.site-header nav a').forEach((navLink) => {
    if (new URL(navLink.href).pathname === href.pathname) navLink.setAttribute('aria-current', 'page')
    else navLink.removeAttribute('aria-current')
  })
  history.pushState({ spa: true }, '', href.pathname)
  window.scrollTo(0, 0)

  /* Last: tittelens posisjon. */
  const title = document.querySelector('.page-title:not(.spa-flip-clone)')
  const main = document.querySelector('#site-layout > main')
  let flip = null

  if (title) {
    const titleRect = title.getBoundingClientRect()
    title.style.visibility = 'hidden'
    const scale = linkRect.height / titleRect.height
    clone.style.top = `${titleRect.top}px`
    clone.style.left = `${titleRect.left}px`
    flip = clone.animate(
      [
        {
          transform: `translate(${linkRect.left - titleRect.left}px, ${linkRect.top - titleRect.top}px) scale(${scale})`,
        },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: 620, easing: SPRING, fill: 'forwards' },
    )
  }

  /* Nytt innhold kaskaderer inn under tittelen. */
  const sections = main ? [...main.children].filter((child) => !child.classList.contains('page-title')) : []
  const entrances = sections.map((section, index) =>
    section.animate(
      [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
      {
        duration: 480,
        delay: 120 + index * 70,
        easing: 'cubic-bezier(0.32, 0.08, 0.24, 1)',
        fill: 'backwards',
      },
    ),
  )

  const finish = () => {
    if (title) title.style.visibility = ''
    clone.remove()
    link.style.visibility = ''
  }
  activeCleanup = () => {
    flip?.cancel()
    entrances.forEach((animation) => animation.finish())
    finish()
  }

  await (flip?.finished ?? Promise.resolve()).catch(() => {})
  finish()
  activeCleanup = null
}

export function initSpaNav() {
  window.addEventListener('popstate', () => {
    location.reload()
  })
}
