let rightNodeCount = 0;
let leftNodeCount = 0;
const viewportWidth = 1200;
const viewportHeight = 600;
const circles = []; // Store all created circles
const usedBends = []; // Track bend points to prevent overlap

// Initialize Canvas Center
const canvas = document.getElementById('canvas');
canvas.style.width = `${viewportWidth}px`;
canvas.style.height = `${viewportHeight}px`;

// Center the first circle
const initialCircle = document.getElementById('A');
initialCircle.style.left = `${viewportWidth / 2 - 15}px`;
initialCircle.style.top = `${viewportHeight / 2 - 15}px`;

// Add initial circle to circles list
circles.push({ id: 'A', x: viewportWidth / 2, y: viewportHeight / 2 });

document.getElementById('create-right').addEventListener('click', () => createNode('right'));
document.getElementById('create-left').addEventListener('click', () => createNode('left'));

function createNode(direction) {
  const dynamicButtons = document.getElementById('dynamic-buttons');

  // Base Node (latest created circle)
  const baseNode = document.getElementById(circles[circles.length - 1].id);
  const baseX = parseInt(baseNode.style.left) + 15;
  const baseY = parseInt(baseNode.style.top) + 15;

  // Random vertical offset
  const verticalOffset = Math.floor(Math.random() * 200 - 100); // -100 to +100
  const newX = direction === 'right' ? baseX + 500 : baseX - 500;
  const newY = baseY + verticalOffset;

  // Create Node
  const newNode = document.createElement('div');
  const nodeId = direction === 'right' ? `B${++rightNodeCount}` : `L${++leftNodeCount}`;
  newNode.className = 'circle';
  newNode.id = nodeId;
  newNode.textContent = nodeId;

  newNode.style.left = `${newX - 15}px`;
  newNode.style.top = `${newY - 15}px`;

  // Add to circles list
  circles.push({ id: nodeId, x: newX, y: newY });

  // Create paths and buttons for all combinations
  const svg = document.querySelector('svg') || createSVGContainer();
  for (const circle of circles) {
    if (circle.id === nodeId) continue; // Skip self

    createBentPathAndButton(svg, circle, { id: nodeId, x: newX, y: newY });
  }

  // Append to DOM
  canvas.appendChild(newNode);
}

function createBentPathAndButton(svg, circle1, circle2) {
  // Create Bent Path
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  // Calculate unique bend points
  const midX1 = (circle1.x + circle2.x) / 2 + uniqueOffset();
  const midY1 = (circle1.y + circle2.y) / 2 + uniqueOffset();

  const midX2 = (circle1.x + circle2.x) / 2 + uniqueOffset();
  const midY2 = (circle1.y + circle2.y) / 2 + uniqueOffset();

  // Define path with two bends
  const pathD = `M ${circle1.x},${circle1.y} L ${midX1},${midY1} L ${midX2},${midY2} L ${circle2.x},${circle2.y}`;
  path.setAttribute('d', pathD);
  path.setAttribute('stroke', getRandomColor());
  path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');

  svg.appendChild(path);

  // Track bends to avoid overlaps
  usedBends.push({ x: midX1, y: midY1 });
  usedBends.push({ x: midX2, y: midY2 });

  // Create Button
  const dynamicButtons = document.getElementById('dynamic-buttons');
  const button = document.createElement('button');
  button.textContent = `Train ${circle1.id}-${circle2.id}`;
  button.addEventListener('click', () => moveTrainAlongPath(path));

  dynamicButtons.appendChild(button);
}

function createSVGContainer() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', viewportWidth);
  svg.setAttribute('height', viewportHeight);
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  canvas.appendChild(svg);
  return svg;
}

function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

function uniqueOffset() {
  let offset;
  do {
    offset = Math.floor(Math.random() * 200 - 100); // Random offset in range
  } while (usedBends.some(bend => Math.abs(bend.x - offset) < 50 && Math.abs(bend.y - offset) < 50)); // Check proximity
  return offset;
}

function moveTrainAlongPath(path) {
  const train = document.createElement('div');
  train.className = 'train';
  canvas.appendChild(train);

  const pathLength = path.getTotalLength();
  let progress = 0;

  const interval = setInterval(() => {
    if (progress >= 1) {
      clearInterval(interval);
      train.remove();
      return;
    }

    progress += 0.01;
    const point = path.getPointAtLength(progress * pathLength);

    train.style.left = `${point.x - 5}px`; // Center train
    train.style.top = `${point.y - 5}px`; // Center train
  }, 10);
}
