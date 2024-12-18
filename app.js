// app.js

// Scroll-to-top button functionality
const scrollButton = document.querySelector('.scroll-up-button');

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    scrollButton.classList.add('show');
  } else {
    scrollButton.classList.remove('show');
  }
});

scrollButton.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Smooth scrolling for navigation links
const navLinks = document.querySelectorAll('.navbar a');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href').slice(1);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 60,
        behavior: 'smooth',
      });
    }
  });
});

// Typing effect for homepage
const typingText = document.querySelector('.typing-text');
const phrases = ["Hello, I'm Rifaath.", "Master's Student in AI.", "Lifelong Learner."];
let currentPhraseIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
  const currentPhrase = phrases[currentPhraseIndex];
  if (isDeleting) {
    typingText.textContent = currentPhrase.slice(0, charIndex--);
  } else {
    typingText.textContent = currentPhrase.slice(0, charIndex++);
  }

  if (!isDeleting && charIndex === currentPhrase.length) {
    isDeleting = true;
    setTimeout(typeEffect, 1000); // Pause before deleting
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
    setTimeout(typeEffect, 500); // Pause before typing new phrase
  } else {
    setTimeout(typeEffect, isDeleting ? 50 : 100);
  }
}

if (typingText) {
  typeEffect();
}

// Intersection Observer for section animations
const sections = document.querySelectorAll('.section');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, {
  threshold: 0.5,
});

sections.forEach(section => {
  observer.observe(section);
});
