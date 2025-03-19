// src/main.js
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sent').forEach((el, index) => {
    el.style.backgroundColor = index % 2 === 0 ? 'lightblue' : 'lightcoral';
  });
});
