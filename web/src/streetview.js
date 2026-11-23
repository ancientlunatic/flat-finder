// Street view box: nearest outdoor Google panorama within 200 m of a society, turned to face it.
// Google loads only on the first click, and each open is one billed Dynamic Street View load.
const KEY = (import.meta.env.MAP_JAVASCRIPT_KEY || '').trim();
export const hasStreetView = !!KEY;

const $ = (id) => document.getElementById(id);
let gmaps = null, pano = null, start = null, token = 0;
let follow = () => {};
// fn([lng, lat], heading) as the viewer walks or turns; fn(null) when the box hides.
export const onStreetViewMove = (fn) => (follow = fn);

const loadGoogle = () => (gmaps ||= new Promise((ok, fail) => {
  window.__ffGmaps = () => ok(window.google.maps);
  document.head.append(Object.assign(document.createElement('script'), {
    src: `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&libraries=geometry&loading=async&callback=__ffGmaps`,
    async: true,
    onerror: () => { gmaps = null; fail(new Error('Google Maps did not load')); },
  }));
}));

function reset() {
  pano.setPano(start.pano);
  pano.setPov(start.pov);
  pano.setVisible(true);
}

export async function openStreetView(s) {
  const t = ++token, msg = $('sv-msg');
  $('sv').hidden = false;
  $('sv-reset').hidden = true;
  pano?.setVisible(false);
  follow(null);
  msg.textContent = 'Finding the nearest street view…';
  try {
    const g = await loadGoogle();
    const target = new g.LatLng(s.lat, s.lng);
    const { data } = await new g.StreetViewService().getPanorama({
      location: target, radius: 200, source: g.StreetViewSource.OUTDOOR, preference: g.StreetViewPreference.NEAREST });
    if (t !== token) return; // closed or another society opened meanwhile
    const at = data.location.latLng, sph = g.geometry.spherical;
    start = { pano: data.location.pano, pov: { heading: sph.computeHeading(at, target), pitch: 0 } };
    if (!pano) {
      pano = new g.StreetViewPanorama($('sv-pano'), { addressControl: false, motionTracking: false, fullscreenControl: true });
      const emit = () => {
        const p = pano.getPosition();
        if (p && pano.getVisible() && !$('sv').hidden) follow([p.lng(), p.lat()], pano.getPov().heading);
      };
      pano.addListener('position_changed', emit);
      pano.addListener('pov_changed', emit);
      pano.addListener('visible_changed', emit);
    }
    reset();
    msg.textContent = `${Math.round(sph.computeDistanceBetween(at, target))} m from ${s.name} · drag to look, click the arrows to walk`;
    $('sv-reset').hidden = false;
  } catch (e) {
    if (t !== token) return;
    msg.textContent = String(e?.code || e?.message).includes('ZERO_RESULTS')
      ? 'No street view within 200 m of this society.' : 'Street view could not load.';
  }
}

export function closeStreetView() {
  token++;
  $('sv').hidden = true;
  follow(null);
}

$('sv-close').onclick = closeStreetView;
$('sv-reset').onclick = () => start && pano && reset();
