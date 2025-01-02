const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageInput = document.getElementById('imageInput');
const addPolygonBtn = document.getElementById('addPolygon');
const downloadDataBtn = document.getElementById('downloadData');
const polygonList = document.getElementById('polygonList');
const tooltip = document.getElementById('tooltip');

let image = new Image();
let polygons = [];
let currentPolygon = null;

imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

image.onload = () => {
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
};

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (currentPolygon) {
        currentPolygon.points.push({ x, y });
        drawCanvas();
    }
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hoveredPolygon = polygons.find(polygon => isPointInPolygon({ x, y }, polygon.points));
    if (hoveredPolygon) {
        tooltip.textContent = hoveredPolygon.label;
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
        tooltip.style.display = 'block';
    } else {
        tooltip.style.display = 'none';
    }
});

addPolygonBtn.addEventListener('click', () => {
    if (currentPolygon) {
        alert('Finish the current polygon before starting a new one!');
        return;
    }

    currentPolygon = { points: [], label: '' };
    polygons.push(currentPolygon);

    const polygonDiv = document.createElement('div');
    polygonDiv.classList.add('polygon');

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Enter label';
    labelInput.addEventListener('input', () => {
        currentPolygon.label = labelInput.value;
    });

    const finishButton = document.createElement('button');
    finishButton.textContent = 'Finish';
    finishButton.addEventListener('click', () => {
        if (currentPolygon.points.length < 3) {
            alert('A polygon must have at least 3 points!');
            return;
        }
        currentPolygon = null;
        finishButton.disabled = true;
        labelInput.disabled = true;
    });

    polygonDiv.appendChild(labelInput);
    polygonDiv.appendChild(finishButton);
    polygonList.prepend(polygonDiv);
});

downloadDataBtn.addEventListener('click', () => {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = `${image.width}px`;
    container.style.height = `${image.height}px`;
    container.style.backgroundImage = `url(${image.src})`;
    container.style.backgroundSize = 'contain';
    container.style.border = '1px solid black';


    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("width", image.width);
    svg.setAttribute("height", image.height);
    svg.style.position = "absolute";

    polygons.forEach(polygon => {

        const polygonElement = document.createElementNS(svgNamespace, "polygon");
        polygonElement.setAttribute(
            "points",
            polygon.points.map(p => `${p.x},${p.y}`).join(" ")
        );
        polygonElement.setAttribute("stroke", "lightgreen");
        polygonElement.setAttribute("stroke-width", "3");
        polygonElement.setAttribute("fill", "transparent");
        polygonElement.style.cursor = "pointer";
        polygonElement.setAttribute("data-label", polygon.label);

        svg.appendChild(polygonElement);
    });
    
    container.appendChild(svg);

    let data = new XMLSerializer().serializeToString(container);
    const script = `<script>
                let tooltip = document.createElement('div');
                tooltip.setAttribute("class", "tooltip")
                document.body.appendChild(tooltip)
                document.querySelectorAll("polygon").forEach(function (c) {
                    const lab = c.dataset.label
                c.addEventListener("mouseover", () => {
                        tooltip.textContent = lab;
                        tooltip.style.display = "block";
                    });
                    c.addEventListener("click", () => {
                        tooltip.textContent = lab;
                        tooltip.style.display = "block";
                    });
                    
                    c.addEventListener("mousemove", (e) => {
                        tooltip.style.left = \`\${e.pageX + 10}px\`;
                        tooltip.style.top = \`\${e.pageY + 10}px\`;
                    });
                    
                    c.addEventListener("mouseout", () => {
                        tooltip.style.display = "none";
                    });
                })</script><style>
                .tooltip {
                    position: absolute;
                    background-color: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 5px;
                    border-radius: 3px;
                    font-size: 12px;
                    pointer-events: none;
                    display: none;
                }</style>`;

    data = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Tagged Image</title></head><body>${data}${script}</body></html>`;

    const blob = new Blob([data], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'tagged_image.html';
    a.click();

    URL.revokeObjectURL(url);
});

function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    polygons.forEach(polygon => {
        ctx.beginPath();
        polygon.points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        if (polygon.points.length > 2) {
            ctx.closePath();
        }
        ctx.strokeStyle = "lightgreen";
        ctx.lineWidth = 3;
        ctx.stroke();
    });
}

function isPointInPolygon(point, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function getPolygonBounds(points) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - y;
    return { x, y, width, height };
}