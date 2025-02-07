
   // ------- Setup the Background Image for the Simulation Canvas -------
    const backgroundImg = new Image();
    backgroundImg.src = "River_Vector.svg"; // Ensure this file is available

    // ------- Setup the Points for the Tracks -------
    const A = { x: 50, y: 150 };
    const B = { x: 750, y: 150 };
    const C = { x: 50, y: 300 };
    const D = { x: 750, y: 300 };

    // Define E and F (100px offset from the ends)
    const E = { x: A.x + 100, y: A.y };
    const F = { x: D.x - 100, y: D.y };

    // Cubic Bézier control points
    const cpOffset = 100;
    const cubicCP1 = { x: E.x + cpOffset, y: E.y };
    const cubicCP2 = { x: F.x - cpOffset, y: F.y };

    // ------- Global Variables for the Train and Route -------
    // routeType: "straight" uses A→B; "diagonal" uses A→E→F→D.
    let routeType = "straight";
    let segments = [];
    let totalRouteLength = 0;

    // Train state variables
    let trainDistance = 0;  // pixels along the route
    let trainSpeed = 0;     // pixels per second

    // Physics constants
    const maxSpeed = 200;          // Maximum speed (px/s)
    const accelerationRate = 100;  // (px/s²)
    const decelerationRate = 100;  // (px/s²)

    // Train drawing constants
    const compartmentWidth = 40;
    const compartmentHeight = 20;
    const compartmentGap = 5;
    const numCompartments = 3;

    // Canvas and drawing context for simulation
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    // ------- Utility Functions -------
    function distance(p, q) {
      return Math.hypot(q.x - p.x, q.y - p.y);
    }

    function lerp(p, q, t) {
      return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    }

    // ---- Cubic Bézier functions ----
    function cubicPoint(p0, p1, p2, p3, t) {
      const u = 1 - t;
      return {
        x: u*u*u * p0.x + 3*u*u*t * p1.x + 3*u*t*t * p2.x + t*t*t * p3.x,
        y: u*u*u * p0.y + 3*u*u*t * p1.y + 3*u*t*t * p2.y + t*t*t * p3.y
      };
    }

    function approximateCubicLength(p0, p1, p2, p3, samples = 20) {
      let length = 0, prev = p0;
      for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        const curr = cubicPoint(p0, p1, p2, p3, t);
        length += distance(prev, curr);
        prev = curr;
      }
      return length;
    }

    // ------- Define the Route Segments -------
    function setupRoute() {
      segments = [];
      totalRouteLength = 0;
      if (routeType === "straight") {
        const len = distance(A, B);
        segments.push({ type: "line", start: A, end: B, length: len });
        totalRouteLength = len;
      } else if (routeType === "diagonal") {
        const len1 = distance(A, E);
        segments.push({ type: "line", start: A, end: E, length: len1 });
        const len2 = approximateCubicLength(E, cubicCP1, cubicCP2, F);
        segments.push({ type: "cubic", start: E, cp1: cubicCP1, cp2: cubicCP2, end: F, length: len2 });
        const len3 = distance(F, D);
        segments.push({ type: "line", start: F, end: D, length: len3 });
        totalRouteLength = len1 + len2 + len3;
      }
    }

    // Return the {x,y} point at a given distance along the route.
    function getPointAtDistance(d) {
      if (d <= 0) return segments[0].start;
      if (d >= totalRouteLength) return segments[segments.length - 1].end;
      let distSoFar = 0;
      for (let seg of segments) {
        if (d <= distSoFar + seg.length) {
          const dInSeg = d - distSoFar;
          const t = dInSeg / seg.length;
          return seg.type === "line" ? lerp(seg.start, seg.end, t)
                                     : cubicPoint(seg.start, seg.cp1, seg.cp2, seg.end, t);
        }
        distSoFar += seg.length;
      }
      return segments[segments.length - 1].end;
    }

    // Compute the tangent (angle) of the route at a given distance.
    function getTangentAngle(d) {
      const delta = 1;
      const d1 = Math.max(0, d - delta);
      const d2 = Math.min(totalRouteLength, d + delta);
      const p1 = getPointAtDistance(d1);
      const p2 = getPointAtDistance(d2);
      return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    // ------- Drawing Functions -------
    function drawTracks() {
      // Draw the SVG background if loaded
      if (backgroundImg.complete) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
      }
      // Draw top track (A → B)
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#0D47A1";
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
      // Draw bottom track (C → D)
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#0D47A1";
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.lineTo(D.x, D.y);
      ctx.stroke();
      // Draw connector track (E → F) as a cubic Bézier
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#F57C00";
      ctx.beginPath();
      ctx.moveTo(E.x, E.y);
      ctx.bezierCurveTo(cubicCP1.x, cubicCP1.y, cubicCP2.x, cubicCP2.y, F.x, F.y);
      ctx.stroke();
      // Label key points
      ctx.fillStyle = "#000";
      ctx.font = "14px sans-serif";
      const labelOffset = 15;
      [[A, "A"], [B, "B"], [C, "C"], [D, "D"], [E, "E"], [F, "F"]].forEach(([pt, label]) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(label, pt.x - 5, pt.y - labelOffset);
      });
    }

    // Draw the train compartments along the route.
    function drawTrain() {
      for (let i = numCompartments - 1; i >= 0; i--) {
        let offsetDistance = trainDistance - (i * (compartmentWidth + compartmentGap) + compartmentWidth / 2);
        if (offsetDistance < 0) offsetDistance = 0;
        const pos = getPointAtDistance(offsetDistance);
        const angle = getTangentAngle(offsetDistance);
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.fillStyle = (i % 2 === 0) ? "#0088cc" : "#00aaff";
        ctx.fillRect(-compartmentWidth / 2, -compartmentHeight / 2, compartmentWidth, compartmentHeight);
        ctx.strokeStyle = "#000";
        ctx.strokeRect(-compartmentWidth / 2, -compartmentHeight / 2, compartmentWidth, compartmentHeight);
        ctx.restore();
      }
    }

    // Draw the speedometer on its dedicated canvas.
    function drawSpeedometer() {
      const speedoCanvas = document.getElementById("speedometer");
      const speedoCtx = speedoCanvas.getContext("2d");
      speedoCtx.clearRect(0, 0, speedoCanvas.width, speedoCanvas.height);
      
      const cx = speedoCanvas.width / 2;
      const cy = speedoCanvas.height / 2;
      const radius = Math.min(cx, cy) - 10;
      
      // Outer circle
      speedoCtx.beginPath();
      speedoCtx.arc(cx, cy, radius, 0, 2 * Math.PI);
      speedoCtx.strokeStyle = "#333";
      speedoCtx.lineWidth = 4;
      speedoCtx.stroke();
      
      // Gauge arc from -135° to +135°
      const startAngle = (-135 * Math.PI) / 180;
      const endAngle = (135 * Math.PI) / 180;
      speedoCtx.beginPath();
      speedoCtx.arc(cx, cy, radius - 10, startAngle, endAngle);
      speedoCtx.strokeStyle = "#0D47A1";
      speedoCtx.lineWidth = 6;
      speedoCtx.stroke();
      
      // Needle: map current trainSpeed to angle
      const needleAngle = startAngle + (trainSpeed / maxSpeed) * (endAngle - startAngle);
      speedoCtx.beginPath();
      speedoCtx.moveTo(cx, cy);
      const needleLength = radius - 20;
      const needleX = cx + needleLength * Math.cos(needleAngle);
      const needleY = cy + needleLength * Math.sin(needleAngle);
      speedoCtx.lineTo(needleX, needleY);
      speedoCtx.strokeStyle = "#F57C00";
      speedoCtx.lineWidth = 4;
      speedoCtx.stroke();
      
      // Speed text display
      speedoCtx.font = "16px sans-serif";
      speedoCtx.fillStyle = "#000";
      const speedText = Math.round(trainSpeed) + " KM/s";
      speedoCtx.fillText(speedText, cx - 30, cy + radius - 50);
    }

    // ------- Animation Loop -------
    let lastTime = null;
    function animate(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      // Get target speed from the slider (0 to 100 mapped to 0 to maxSpeed)
      const slider = document.getElementById("speedSlider");
      const targetSpeed = (slider.value / 100) * maxSpeed;
      
      // Gradually adjust trainSpeed toward targetSpeed
      if (trainSpeed < targetSpeed) {
        trainSpeed += accelerationRate * dt;
        if (trainSpeed > targetSpeed) trainSpeed = targetSpeed;
      } else if (trainSpeed > targetSpeed) {
        trainSpeed -= decelerationRate * dt;
        if (trainSpeed < targetSpeed) trainSpeed = targetSpeed;
      }
      
      // Update train distance along the route.
      trainDistance += trainSpeed * dt;
      if (trainDistance >= totalRouteLength) {
        trainDistance = totalRouteLength;
        trainSpeed = 0;
      }
      
      // Clear and redraw simulation.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTracks();
      drawTrain();
      drawSpeedometer();
      
      // Update the signal light color based on train speed.
      const signalLight = document.querySelector(".signalLight");
      signalLight.style.backgroundColor = (trainSpeed > 0) ? "green" : "red";
      
      requestAnimationFrame(animate);
    }

    // ------- Event Listeners -------
    // Toggle switch for changing track (only when the train is stopped).
    const toggleRouteSwitch = document.getElementById("toggleRouteBtn");
    const toggleRouteLabel = document.getElementById("toggleRouteLabel");
    toggleRouteSwitch.addEventListener("change", () => {
      if (trainSpeed === 0 && (trainDistance === 0 || trainDistance === totalRouteLength)) {
        routeType = toggleRouteSwitch.checked ? "diagonal" : "straight";
        toggleRouteLabel.textContent = "Track: " + (routeType === "straight" ? "Straight" : "Diagonal");
        trainDistance = 0;
        trainSpeed = 0;
        setupRoute();
      } else {
        // If train is moving, revert the switch.
        toggleRouteSwitch.checked = (routeType === "diagonal");
      }
    });

    // Reset button: resets train position and speed, and resets the speed slider.
    const resetBtn = document.getElementById("resetBtn");
    resetBtn.addEventListener("click", () => {
      trainDistance = 0;
      trainSpeed = 0;
      document.getElementById("speedSlider").value = 0;
    });

    // Signal light: on click, set the train speed to 20 px/s (and update slider accordingly) to start the train.
    const signalLight = document.querySelector(".signalLight");
    signalLight.addEventListener("click", () => {
      const slider = document.getElementById("speedSlider");
      const newSpeed = 20; // desired speed in px/s
      // Update slider value to reflect new target speed (convert to 0-100 scale)
      slider.value = (newSpeed / maxSpeed) * 100;
      // Optionally, directly set trainSpeed as well.
      trainSpeed = newSpeed;
    });

    // ------- Initialization -------
    setupRoute();
    requestAnimationFrame(animate);
