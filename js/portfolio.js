/**
 * DIGIFRONT DOOR — PORTFOLIO & SHOWCASE SYSTEM
 * Category filtering, detail modal, deep-linking, and quote handoff.
 */

(() => {
  'use strict';

  // Project data registry
  const PROJECTS = [
    {
      id: 'apex-dental',
      title: 'Apex Dental Care',
      category: 'business',
      categoryLabel: 'Business Website',
      status: 'Concept Demo',
      tagline: 'High-trust medical practice site converting Google Maps searches into dental appointments.',
      challenge: 'Local clinics often have strong 5-star Google review scores but lose high-value private patient inquiries because their Google profile links to a slow, outdated PDF menu or no website at all.',
      solution: 'Crafted a pristine, mobile-first clinic website with one-tap emergency calling, interactive treatment cards, patient reviews sync, and instant online appointment booking request.',
      deliverables: ['Custom 5-page responsive site', 'Google Maps sync & click-to-call', 'Direct booking form', 'Local SEO structured data'],
      tech: ['HTML5', 'Modern CSS', 'Vanilla JS', 'LocalBusiness Schema', 'WebP'],
      rating: '4.9',
      reviewsCount: '84',
      demoUrl: '#',
      color: '#0284c7'
    },
    {
      id: 'forge-craft',
      title: 'Forge & Oak Joinery',
      category: 'portfolio',
      categoryLabel: 'Portfolio & Trades',
      status: 'Concept Demo',
      tagline: 'Bespoke architectural woodworking portfolio designed to win high-ticket domestic contracts.',
      challenge: 'Artisan craftsmen rely on word of mouth and Instagram, but lack an authoritative, organized showcase to present past renovations and justify premium pricing to luxury homeowners.',
      solution: 'Built an elegant dark-and-warm bento portfolio showing before-and-after project transformations, timber specifications, client testimonials, and a custom consultation estimator.',
      deliverables: ['High-resolution responsive gallery', 'Interactive project filter', 'Quote inquiry questionnaire', 'Image compression pipeline'],
      tech: ['HTML5', 'CSS Grid', 'Custom Lightbox', 'Schema.org'],
      rating: '5.0',
      reviewsCount: '38',
      demoUrl: '#',
      color: '#d97706'
    },
    {
      id: 'lumina-skin',
      title: 'Lumina Aesthetic Clinic',
      category: 'landing',
      categoryLabel: 'Landing Page',
      status: 'Concept Demo',
      tagline: 'High-converting Google Ads landing page focused on laser skincare packages and consultation bookings.',
      challenge: 'High cost-per-click ad campaigns were delivering low conversion rates because the ad traffic landed on an unfocused general website homepage.',
      solution: 'Constructed a dedicated, distraction-free landing page with concise benefits, treatment comparison tables, practitioner credentials, and multi-step inquiry capture.',
      deliverables: ['Single-page conversion funnel', 'A/B test-ready architecture', 'Direct WhatsApp & SMS link', 'Speed-optimized assets (<1s load)'],
      tech: ['HTML5', 'Tailwind-inspired CSS', 'Vanilla JS', 'Core Web Vitals A+'],
      rating: '4.8',
      reviewsCount: '112',
      demoUrl: '#',
      color: '#ec4899'
    },
    {
      id: 'verde-botanica',
      title: 'Verde Artisanal Coffee & Plants',
      category: 'ecommerce',
      categoryLabel: 'E-commerce',
      status: 'Concept Demo',
      tagline: 'Local neighborhood cafe and rare plant boutique with seamless local pickup and bean subscriptions.',
      challenge: 'A bustling neighborhood specialty cafe needed to capture recurring monthly coffee bean orders and allow locals to preorder seasonal botanical collections.',
      solution: 'Engineered a lightweight, lightning-fast storefront with zero bloat, mobile cart drawer, subscription options, and Google Business Profile store integration.',
      deliverables: ['Product catalog & quick cart', 'Subscription tier selector', 'Pickup scheduling module', 'Mobile checkout optimization'],
      tech: ['HTML5', 'Modern JS Store Engine', 'Local Storage', 'Store Schema'],
      rating: '4.9',
      reviewsCount: '196',
      demoUrl: '#',
      color: '#10b981'
    },
    {
      id: 'summit-logistics',
      title: 'Summit Freight & Logistics',
      category: 'business',
      categoryLabel: 'Corporate Business',
      status: 'Concept Demo',
      tagline: 'B2B freight brokerage website providing instant quote estimation and real-time fleet capabilities.',
      challenge: 'Outdated corporate website failed to establish enterprise credibility for shipping managers looking for regional logistics partners.',
      solution: 'Created an authoritative corporate portal featuring route maps, capability matrices, compliance documentation, and a dynamic freight quote calculator.',
      deliverables: ['7-page corporate structure', 'Freight quote estimator', 'Interactive route coverage map', 'Downloadable compliance pack'],
      tech: ['HTML5', 'Custom SVG Diagrams', 'Vanilla JS', 'Organization Schema'],
      rating: '5.0',
      reviewsCount: '45',
      demoUrl: '#',
      color: '#6366f1'
    },
    {
      id: 'zenith-interiors',
      title: 'Zenith Studio Architecture',
      category: 'portfolio',
      categoryLabel: 'Architecture Portfolio',
      status: 'Concept Demo',
      tagline: 'Minimalist editorial showcase for commercial interior design and sustainable architecture.',
      challenge: 'Standard website themes compromised the clean editorial feel required by an award-winning architectural firm.',
      solution: 'Implemented an ultra-clean layout with fluid typography, responsive full-bleed imagery, and smooth micro-interactions that let the architecture speak.',
      deliverables: ['Editorial portfolio layout', 'Project case-study templates', 'Press & publications archive', 'Client portal link'],
      tech: ['HTML5', 'CSS Subgrid', 'Vanilla JS', 'Optimized WebP'],
      rating: '4.9',
      reviewsCount: '29',
      demoUrl: '#',
      color: '#8b5cf6'
    }
  ];

  window.DIGIFRONT_PROJECTS = PROJECTS;

  // Filter Tabs
  const filterBtns = document.querySelectorAll('.portfolio-filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  if (filterBtns.length > 0 && projectCards.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const filter = btn.getAttribute('data-filter');

        projectCards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            card.style.display = '';
            card.classList.remove('is-hidden');
          } else {
            card.style.display = 'none';
            card.classList.add('is-hidden');
          }
        });
      });
    });
  }

  // Modal Setup
  const modalBackdrop = document.getElementById('projectModal');
  const modalCloseBtn = document.getElementById('modalClose');
  const modalTitle = document.getElementById('modalTitle');
  const modalCategory = document.getElementById('modalCategory');
  const modalStatus = document.getElementById('modalStatus');
  const modalTagline = document.getElementById('modalTagline');
  const modalChallenge = document.getElementById('modalChallenge');
  const modalSolution = document.getElementById('modalSolution');
  const modalDeliverables = document.getElementById('modalDeliverables');
  const modalTech = document.getElementById('modalTech');
  const modalCtaBtn = document.getElementById('modalCtaBtn');

  function openProjectModal(projectId) {
    const project = PROJECTS.find(p => p.id === projectId);
    if (!project || !modalBackdrop) return;

    if (modalTitle) modalTitle.textContent = project.title;
    if (modalCategory) modalCategory.textContent = project.categoryLabel;
    if (modalStatus) modalStatus.textContent = project.status;
    if (modalTagline) modalTagline.textContent = project.tagline;
    if (modalChallenge) modalChallenge.textContent = project.challenge;
    if (modalSolution) modalSolution.textContent = project.solution;

    if (modalDeliverables) {
      modalDeliverables.innerHTML = project.deliverables.map(item => `
        <li>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#e8742f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${item}</span>
        </li>
      `).join('');
    }

    if (modalTech) {
      modalTech.innerHTML = project.tech.map(t => `<span class="tech-pill">${t}</span>`).join('');
    }

    if (modalCtaBtn) {
      modalCtaBtn.setAttribute('href', `contact.html?project=${encodeURIComponent(project.title)}&service=${encodeURIComponent(project.categoryLabel)}`);
    }

    modalBackdrop.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    modalCloseBtn?.focus();
  }

  function closeProjectModal() {
    if (!modalBackdrop) return;
    modalBackdrop.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeProjectModal);
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        closeProjectModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop?.classList.contains('is-active')) {
      closeProjectModal();
    }
  });

  // Attach open handlers
  document.querySelectorAll('[data-open-project]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const id = trigger.getAttribute('data-open-project');
      openProjectModal(id);
    });
  });

  // Check URL parameter for direct deep link
  const urlParams = new URLSearchParams(window.location.search);
  const deepProjectId = urlParams.get('project');
  if (deepProjectId) {
    const matched = PROJECTS.find(p => p.id === deepProjectId || p.title.toLowerCase().includes(deepProjectId.toLowerCase()));
    if (matched) {
      setTimeout(() => openProjectModal(matched.id), 300);
    }
  }

})();
