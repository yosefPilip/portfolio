// Shared chrome behavior (mobile menu, smooth scroll, reveal-on-scroll, rail active state,
// hero parallax, card tilt) used by every page's header/rail/hero markup.

// smooth scroll for in-page anchors + close mobile menu on any nav click
document.querySelectorAll('a').forEach(function (a) {
  var href = a.getAttribute('href');
  if (href && href.charAt(0) === '#') {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(href as string);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
      var mobileMenu = document.getElementById('mobileMenu');
      if (mobileMenu) mobileMenu.classList.remove('open');
    });
  }
});

// mobile menu toggle
var menuOpen = document.getElementById('menuOpen');
var menuClose = document.getElementById('menuClose');
var mobileMenuEl = document.getElementById('mobileMenu');

if (menuOpen && mobileMenuEl) {
  var openMenuEl = mobileMenuEl;
  menuOpen.addEventListener('click', function () {
    openMenuEl.classList.add('open');
  });
}

if (menuClose && mobileMenuEl) {
  var closeMenuEl = mobileMenuEl;
  menuClose.addEventListener('click', function () {
    closeMenuEl.classList.remove('open');
  });
}

// scroll-reveal
var revealObserver = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
);

document.querySelectorAll('.reveal').forEach(function (el) {
  revealObserver.observe(el);
});

// active rail-link highlighting (in-page sections only)
var railLinks = document.querySelectorAll('.rail-link[href^="#"]');

if (railLinks.length) {
  var sectionObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          railLinks.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        }
      });
    },
    { threshold: 0.5 },
  );

  document.querySelectorAll('main section[id]').forEach(function (s) {
    sectionObserver.observe(s);
  });
}

// hero parallax (desktop only, respects reduced motion) — only present on the home page
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isTouch = window.matchMedia('(pointer: coarse)').matches;
var heroBg = document.getElementById('heroBg');

if (heroBg && !reduceMotion) {
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        heroBg!.style.transform = 'translateY(' + window.pageYOffset * 0.35 + 'px)';
        ticking = false;
      });
      ticking = true;
    }
  });
}

// subtle tilt on glass cards (desktop, fine pointer only)
if (!isTouch && !reduceMotion) {
  document.querySelectorAll<HTMLElement>('.exp-card, .project-card, .project-featured').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = 'perspective(800px) rotateX(' + y * -3 + 'deg) rotateY(' + x * 3 + 'deg) translateY(-2px)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });
}
