// script.js - evasive No button that avoids overlapping the Yes button

/* --------------- CONFIG --------------- */
const ORIGINAL_IMG = "https://gifdb.com/images/thumbnail/puppy-begging-cute-dj9os8ocgpqcoyw2.webp";

const NO_IMAGES = [
  "https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif",
  "https://media.giphy.com/media/5xtDarqCp0k4E3q2w4g/giphy.gif",
  "https://media.giphy.com/media/26AOSKk7uXr5w1mzy/giphy.gif",
  "https://media.giphy.com/media/l0MYyDa8I3b2w7KpC/giphy.gif"
];

const NO_MESSAGES = [
  "Why are you doing this 😣",
  "Please... one more chance? 😌",
  "Pretty please? 🙏",
  "I promise I'll make it worth your time! 😢",
  "Last chance? I won't bother again, I swear! 😭"
];

const LOVE_GIF = "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif";
const YES_H3 = "Yay — I'm so happy!";
const YES_H6 = "Can't wait 😄";
const PLEAD_H6 = "Please?";

/* evasive tuning */
const EVADE_MIN_DISTANCE = 120;   // px — min distance from last pointer center
const FLOAT_INTERVAL_MS_DESKTOP = 1200;
const FLOAT_INTERVAL_MS_MOBILE = 1000;
const MOVE_TRANSITION_MS = 260;
const FLOAT_TRIGGER_ATTEMPT = 5; // starts floating when noCount >= this
const AVOID_MARGIN = 8; // extra pixels to keep away from Yes button
/* -------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const imgEl = document.querySelector("#gif-div img");
  const h3 = document.querySelector("#center-box h3");
  const h6 = document.querySelector("#center-box h6");
  const yesBtn = document.querySelector("#answer button:first-child");
  const noBtn = document.querySelector("#answer button:last-child");
  const centerBox = document.querySelector("#center-box");

  if (!imgEl || !h3 || !h6 || !yesBtn || !noBtn || !centerBox) return;

  const IS_MOBILE = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;

  imgEl.src = ORIGINAL_IMG;
  imgEl.style.transition = "opacity 220ms ease";

  function fadeSwapImage(url) {
    imgEl.style.opacity = 0;
    setTimeout(() => {
      imgEl.src = url;
      imgEl.onload = () => (imgEl.style.opacity = 1);
      setTimeout(() => (imgEl.style.opacity = 1), 350);
    }, 220);
  }

  let noCount = 0;
  let evasiveActive = false;
  let floatInterval = null;
  let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  noBtn.style.transition = `left ${MOVE_TRANSITION_MS}ms ease, top ${MOVE_TRANSITION_MS}ms ease, transform ${MOVE_TRANSITION_MS}ms ease`;
  noBtn.style.willChange = "left, top, transform";

  // Get the Yes button rect (dynamic each time we check)
  function getYesRect() {
    return yesBtn.getBoundingClientRect();
  }

  // Check overlap between candidate rect (x,y,w,h) and yes rect (+ margin)
  function overlapsYes(x, y, w, h) {
    const yes = getYesRect();
    const leftA = x, rightA = x + w, topA = y, bottomA = y + h;
    const leftB = yes.left - AVOID_MARGIN, rightB = yes.right + AVOID_MARGIN;
    const topB = yes.top - AVOID_MARGIN, bottomB = yes.bottom + AVOID_MARGIN;
    // rectangles intersect?
    return !(rightA < leftB || leftA > rightB || bottomA < topB || topA > bottomB);
  }

  // track pointer / touch
  function onPointerMove(e) {
    lastPointer.x = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX) ?? lastPointer.x;
    lastPointer.y = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY) ?? lastPointer.y;
    if (evasiveActive && !IS_MOBILE) {
      maybeDodgeFromCursor();
    }
  }
  if (IS_MOBILE) {
    document.addEventListener('touchstart', onPointerMove, {passive:true});
    document.addEventListener('touchmove', onPointerMove, {passive:true});
  } else {
    document.addEventListener('mousemove', onPointerMove);
  }

  // choose a safe random position that does NOT overlap the Yes button and is far from pointer
  function getSafeRandomPosition(btnWidth, btnHeight) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const attempts = 80;
    for (let i = 0; i < attempts; i++) {
      const x = Math.floor(Math.random() * Math.max(1, vw - btnWidth - 16)) + 8;
      const y = Math.floor(Math.random() * Math.max(1, vh - btnHeight - 16)) + 8;
      const cx = x + btnWidth / 2;
      const cy = y + btnHeight / 2;
      const d = Math.hypot(cx - lastPointer.x, cy - lastPointer.y);
      if (d >= EVADE_MIN_DISTANCE && !overlapsYes(x, y, btnWidth, btnHeight)) return { x, y };
    }
    // fallback: try to place opposite the pointer but avoid Yes rect
    const centerX = vw / 2, centerY = vh / 2;
    const dirX = lastPointer.x < centerX ? 1 : -1;
    const dirY = lastPointer.y < centerY ? 1 : -1;
    let fx = Math.min(Math.max(12, centerX + dirX * 150 - btnWidth / 2), vw - btnWidth - 12);
    let fy = Math.min(Math.max(12, centerY + dirY * 150 - btnHeight / 2), vh - btnHeight - 12);

    // if fallback overlaps yes, nudge it
    let tries = 0;
    while (overlapsYes(fx, fy, btnWidth, btnHeight) && tries < 20) {
      fx = Math.min(Math.max(12, fx + (Math.random() > 0.5 ? 60 : -60)), vw - btnWidth - 12);
      fy = Math.min(Math.max(12, fy + (Math.random() > 0.5 ? 60 : -60)), vh - btnHeight - 12);
      tries++;
    }
    return { x: fx, y: fy };
  }

  // place No button fixed
  function placeNoButtonAt(x, y) {
    noBtn.style.position = "fixed";
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
    noBtn.style.zIndex = 9999;
  }

  // dodge the cursor: if dodge overlaps Yes, push further along same vector until safe
  function maybeDodgeFromCursor() {
    const btnRect = noBtn.getBoundingClientRect();
    const btnCenterX = btnRect.left + btnRect.width / 2;
    const btnCenterY = btnRect.top + btnRect.height / 2;
    const dist = Math.hypot(btnCenterX - lastPointer.x, btnCenterY - lastPointer.y);
    if (dist < EVADE_MIN_DISTANCE) {
      let awayX = (btnCenterX - lastPointer.x) / (dist || 1);
      let awayY = (btnCenterY - lastPointer.y) / (dist || 1);
      const baseShift = Math.max(EVADE_MIN_DISTANCE * 1.1, 160);
      let newCenterX = btnCenterX + awayX * baseShift;
      let newCenterY = btnCenterY + awayY * baseShift;

      const vw = window.innerWidth, vh = window.innerHeight;
      const w = btnRect.width, h = btnRect.height;

      // clamp and ensure no overlap with Yes; if overlap occurs, continue pushing further
      let newLeft = newCenterX - w / 2;
      let newTop = newCenterY - h / 2;

      let attempts = 0;
      while (overlapsYes(newLeft, newTop, w, h) && attempts < 10) {
        // push further in same direction
        newCenterX += awayX * 80 * (attempts + 1);
        newCenterY += awayY * 80 * (attempts + 1);
        newLeft = Math.min(Math.max(newCenterX - w / 2, 8), vw - w - 8);
        newTop = Math.min(Math.max(newCenterY - h / 2, 8), vh - h - 8);
        attempts++;
      }

      // final clamp
      newLeft = Math.min(Math.max(newLeft, 8), vw - w - 8);
      newTop = Math.min(Math.max(newTop, 8), vh - h - 8);
      placeNoButtonAt(newLeft, newTop);
    }
  }

  // floating management
  function startFloating(intervalMs) {
    if (floatInterval) return;
    const rect = noBtn.getBoundingClientRect();
    // pick an immediate safe position (so it doesn't overlap Yes)
    const startPos = getSafeRandomPosition(rect.width, rect.height);
    placeNoButtonAt(startPos.x, startPos.y);

    floatInterval = setInterval(() => {
      const rect2 = noBtn.getBoundingClientRect();
      const pos = getSafeRandomPosition(rect2.width, rect2.height);
      placeNoButtonAt(pos.x, pos.y);
    }, intervalMs);
  }
  function stopFloating() {
    if (!floatInterval) return;
    clearInterval(floatInterval);
    floatInterval = null;
  }

  function enableEvasiveMode(desktop = true) {
    if (evasiveActive) return;
    evasiveActive = true;
    if (desktop) startFloating(FLOAT_INTERVAL_MS_DESKTOP);
    else startFloating(FLOAT_INTERVAL_MS_MOBILE);
  }
  function disableEvasiveMode() {
    if (!evasiveActive) return;
    evasiveActive = false;
    stopFloating();
    noBtn.style.zIndex = "";
  }

  // NO button click: cycle image/text; start evasive when threshold reached
  noBtn.addEventListener("click", () => {
    noCount += 1;
    const msgIndex = Math.min(noCount - 1, NO_MESSAGES.length - 1);
    h3.textContent = NO_MESSAGES[msgIndex] + (noCount > NO_MESSAGES.length ? ` (Attempt ${noCount})` : "");
    h6.textContent = PLEAD_H6;

    if (Array.isArray(NO_IMAGES) && NO_IMAGES.length > 0) {
      const imgIndex = (noCount - 1) % NO_IMAGES.length;
      fadeSwapImage(NO_IMAGES[imgIndex]);
    }

    // start evasive floating IMMEDIATELY when threshold reached (e.g., 5)
    if (noCount >= FLOAT_TRIGGER_ATTEMPT) {
      enableEvasiveMode(!IS_MOBILE);
    } else {
      disableEvasiveMode();
    }

    // keep both visible until Yes
    yesBtn.style.display = "";
    noBtn.style.display = "";
  });

  // YES button: end everything
  yesBtn.addEventListener("click", () => {
    disableEvasiveMode();
    fadeSwapImage(LOVE_GIF);
    h3.textContent = YES_H3;
    h6.textContent = YES_H6;
    yesBtn.style.display = "none";
    noBtn.style.display = "none";
  });

  // keep No inside viewport on resize
  window.addEventListener("resize", () => {
    if (!evasiveActive) return;
    const btnRect = noBtn.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const newLeft = Math.min(Math.max(8, btnRect.left), vw - btnRect.width - 8);
    const newTop = Math.min(Math.max(8, btnRect.top), vh - btnRect.height - 8);
    // ensure new spot doesn't overlap Yes
    if (overlapsYes(newLeft, newTop, btnRect.width, btnRect.height)) {
      const pos = getSafeRandomPosition(btnRect.width, btnRect.height);
      placeNoButtonAt(pos.x, pos.y);
    } else {
      placeNoButtonAt(newLeft, newTop);
    }
  });

  // optional reset (uncomment for testing)
  // imgEl.addEventListener('click', () => {
  //   noCount = 0;
  //   disableEvasiveMode();
  //   fadeSwapImage(ORIGINAL_IMG);
  //   h3.textContent = "Wanna go on a Date with me 😉";
  //   h6.textContent = "Please give me a chance 🤗";
  //   yesBtn.style.display = "";
  //   noBtn.style.display = "";
  // });
});
