(function () {
  'use strict';

  const modal     = document.getElementById('flightDetailsModal');
  const overlay   = document.getElementById('fdOverlay');
  const closeBtn  = document.getElementById('fdCloseBtn');
  const shareBtn  = document.getElementById('fdShareBtn');
  const shareMenu = document.getElementById('fdShareMenu');
  const selectBtn = document.getElementById('fdSelectBtn');
  const toast     = document.getElementById('fdToast');

  let currentOffer = null;

  // ---------- Open / Close ----------
  function openModal(offer) {
    currentOffer = offer;
    renderSummary(offer);
    renderTabs(offer);
    updatePrice(offer);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    shareMenu.hidden = true;
  }

  // ---------- Render Summary ----------
  function renderSummary(offer) {
    const slice = offer.slices[0];
    const dep   = slice.departure;
    const arr   = slice.arrival;
    const stopsText = slice.stops === 0 ? 'Direct flight' : `${slice.stops} stop${slice.stops > 1 ? 's' : ''}`;

    document.getElementById('fdSummary').innerHTML = `
      <div class="fd-airline-row">
        ${offer.airline.logo
          ? `<img src="${offer.airline.logo}" alt="" class="fd-airline-logo">`
          : `<div class="fd-airline-logo" style="display:flex;align-items:center;justify-content:center;font-weight:700;color:#64748b">${offer.airline.code || ''}</div>`}
        <div>
          <div class="fd-airline-name">${offer.airline.name || '—'}</div>
          <div class="fd-flight-meta">${slice.flight_number || ''} · ${offer.cabin || 'Economy'}</div>
        </div>
      </div>

      <div class="fd-route">
        <div class="fd-city-block">
          <div class="fd-city-code">${dep.airport || '—'}</div>
          <div class="fd-city-name">${dep.city || ''}</div>
          <div class="fd-time">${dep.time || '—'}</div>
          <div class="fd-date">${formatDate(dep.date)}</div>
        </div>

        <div class="fd-plane-line">
          <span>${slice.duration_text || ''}</span>
          <div class="line"><i class="fa-solid fa-plane"></i></div>
          <span>${stopsText}</span>
        </div>

        <div class="fd-city-block">
          <div class="fd-city-code">${arr.airport || '—'}</div>
          <div class="fd-city-name">${arr.city || ''}</div>
          <div class="fd-time">${arr.time || '—'}</div>
          <div class="fd-date">${formatDate(arr.date)}</div>
        </div>
      </div>
    `;
  }

  // ---------- Render Tabs ----------
  function renderTabs(offer) {
    const slice = offer.slices[0];
    const dep   = slice.departure;
    const arr   = slice.arrival;

    // Travel Info
    document.getElementById('fdTab-info').innerHTML = `
      <div class="fd-info-grid">
        ${infoCard('Departure time', `${dep.time || '—'}<br><small>${formatDate(dep.date)}</small>`)}
        ${infoCard('Arrival time', `${arr.time || '—'}<br><small>${formatDate(arr.date)}</small>`)}
        ${infoCard('Duration', slice.duration_text || '—')}
        ${infoCard('Airline', offer.airline.name || '—')}
        ${infoCard('Flight number', slice.flight_number || '—')}
        ${infoCard('Origin airport', `${dep.city || ''} (${dep.airport || ''})`)}
        ${infoCard('Destination airport', `${arr.city || ''} (${arr.airport || ''})`)}
        ${infoCard('Cabin class', offer.cabin || 'Economy')}
        ${slice.aircraft ? infoCard('Aircraft', slice.aircraft) : ''}
        ${infoCard('Stops', slice.stops === 0 ? 'Direct' : slice.stops)}
      </div>
    `;

    // Baggage
    const bag = offer.baggage || {};
    document.getElementById('fdTab-baggage').innerHTML = `
      <div class="fd-baggage-list">
        <div class="fd-baggage-item">
          <div class="fd-baggage-icon"><i class="fa-solid fa-suitcase-rolling"></i></div>
          <div>
            <div class="fd-baggage-title">Checked baggage</div>
            <div class="fd-baggage-value">${bag.checked || 0} × 23 kg</div>
          </div>
        </div>
        <div class="fd-baggage-item">
          <div class="fd-baggage-icon"><i class="fa-solid fa-briefcase"></i></div>
          <div>
            <div class="fd-baggage-title">Carry-on baggage</div>
            <div class="fd-baggage-value">${bag.carry_on || 0} piece (max 7 kg)</div>
          </div>
        </div>
      </div>
    `;

    // Refund Policy
    document.getElementById('fdTab-refund').innerHTML = `
      <div class="fd-refund-list">
        <div class="fd-refund-item">
          <span class="fd-refund-time">Up to 7 days before departure</span>
          <span class="fd-refund-penalty">30% penalty</span>
        </div>
        <div class="fd-refund-item">
          <span class="fd-refund-time">7 days to 72 hours before</span>
          <span class="fd-refund-penalty">50% penalty</span>
        </div>
        <div class="fd-refund-item">
          <span class="fd-refund-time">72 to 24 hours before</span>
          <span class="fd-refund-penalty">70% penalty</span>
        </div>
        <div class="fd-refund-item">
          <span class="fd-refund-time">24 to 8 hours before</span>
          <span class="fd-refund-penalty">85% penalty</span>
        </div>
        <div class="fd-refund-item">
          <span class="fd-refund-time">Less than 8 hours</span>
          <span class="fd-refund-penalty">100% penalty</span>
        </div>
      </div>
      <div class="fd-notice">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>The final refund amount is calculated according to the ticket rules and airline conditions.</p>
      </div>
    `;
  }

  function infoCard(label, value) {
    return `
      <div class="fd-info-card">
        <div class="fd-info-label">${label}</div>
        <div class="fd-info-value">${value}</div>
      </div>
    `;
  }

  function updatePrice(offer) {
    const amount   = offer.price?.amount   || '—';
    const currency = offer.price?.currency || '';
    document.getElementById('fdPriceAmount').textContent = `${amount} ${currency}`;
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ---------- Tabs ----------
  document.querySelectorAll('.fd-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.fd-tab').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.fd-tab-content').forEach(c => c.hidden = true);

      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById('fdTab-' + tab.dataset.tab).hidden = false;
    });
  });

  // ---------- Share ----------
  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    shareMenu.hidden = !shareMenu.hidden;
  });

  document.addEventListener('click', (e) => {
    if (!shareMenu.contains(e.target) && e.target !== shareBtn) {
      shareMenu.hidden = true;
    }
  });

  shareMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-share]');
    if (!btn || !currentOffer) return;

    const type = btn.dataset.share;
    const url  = `${window.location.origin}/flights/details/${currentOffer.id}/`;

    if (type === 'copy') {
      navigator.clipboard.writeText(url).then(() => {
        toast.hidden = false;
        setTimeout(() => toast.hidden = true, 2500);
      });
    } else if (type === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank');
    } else if (type === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, '_blank');
    } else if (type === 'email') {
      window.location.href = `mailto:?subject=Flight Details&body=${encodeURIComponent(url)}`;
    }
    shareMenu.hidden = true;
  });

  // ---------- Select Button (Login Check) ----------
  selectBtn.addEventListener('click', () => {
    if (!currentOffer) return;

    const isLoggedIn = document.body.dataset.userAuthenticated === 'true';

    if (!isLoggedIn) {
      const next = encodeURIComponent(`/booking/passengers/?offer=${currentOffer.id}`);
      window.location.href = `/account/login/?next=${next}`;
      return;
    }

    window.location.href = `/booking/passengers/?offer=${currentOffer.id}`;
  });

  // ---------- Events ----------
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  // Public API – call from flight cards
  window.openFlightDetails = openModal;
})();