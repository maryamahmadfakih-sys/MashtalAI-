import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './responsive.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// 📱 On phones/tablets the sidebar becomes a swipeable top menu:
// keep the current page's tab scrolled into view.
let lastPath = "";
const centerActiveTab = () => {
  const nav = document.querySelector(".app-nav");
  if (!nav || window.innerWidth > 900) return;
  if (lastPath === window.location.pathname && nav.dataset.centered) return;
  const active = [...nav.children].find(
    (el) => getComputedStyle(el).backgroundColor === "rgb(45, 106, 79)"
  );
  if (!active) return;
  const navBox = nav.getBoundingClientRect();
  const tabBox = active.getBoundingClientRect();
  nav.scrollLeft += tabBox.left - navBox.left - (navBox.width - tabBox.width) / 2;
  nav.dataset.centered = "1";
  lastPath = window.location.pathname;
};
new MutationObserver(() => requestAnimationFrame(centerActiveTab)).observe(
  document.getElementById("root"),
  { childList: true, subtree: true }
);
