document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = document.getElementById('drawing-canvas');
    const ctx = canvas.getContext('2d');
    const textLayer = document.getElementById('text-layer');
    
    // Shape definitions (moved to top)
    const shapes = [
        { name: 'rectangle', icon: '□', draw: drawRectangle },
        { name: 'circle', icon: '○', draw: drawCircle },
        { name: 'triangle', icon: '△', draw: drawTriangle },
        { name: 'line', icon: '─', draw: drawLine },
        { name: 'arrow', icon: '→', draw: drawArrow },
        { name: 'star', icon: '★', draw: drawStar }
    ];

    // Set initial canvas size
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        canvas.width = container.clientWidth * 0.9;
        canvas.height = container.clientHeight * 0.9;
        
        // Redraw current page if exists
        if (currentPageIndex !== -1 && pages[currentPageIndex]) {
            redrawCanvas();
        }
    }
    
    // App state
    let isDrawing = false;
    let currentTool = 'pencil';
    let currentColor = '#000000';
    let currentSecondaryColor = '#ffffff';
    let brushSize = 5;
    let paintStyle = 'solid';
    let currentShape = 'rectangle';
    let fillShape = false;
    let startX, startY;
    let textInputActive = false;
    let currentTextElement = null;
    let pages = [];
    let currentPageIndex = -1;
    let drawingHistory = [];
    let historyIndex = -1;
    let modalAction = '';
    
    // Initialize the app
    function initApp() {
        setupColorPalette();
        setupShapeButtons();
        setupToolButtons();
        setupEventListeners();
        createNewPage();
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    // Color palette setup
    function setupColorPalette() {
        const colorPalette = [
            '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
            '#ffff00', '#00ffff', '#ff00ff', '#c0c0c0', '#808080',
            '#800000', '#808000', '#008000', '#800080', '#008080'
        ];
        
        const container = document.querySelector('.color-palette');
        colorPalette.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;
            swatch.addEventListener('click', () => {
                currentColor = color;
                document.getElementById('primary-color').value = color;
            });
            container.appendChild(swatch);
        });
    }
    
    // Shape buttons setup
    function setupShapeButtons() {
        const container = document.querySelector('.shape-options');
        shapes.forEach(shape => {
            const btn = document.createElement('button');
            btn.className = 'shape-btn';
            btn.innerHTML = shape.icon;
            btn.title = shape.name;
            btn.addEventListener('click', () => {
                currentShape = shape.name;
                document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            container.appendChild(btn);
        });
        
        // Activate first shape by default
        document.querySelector('.shape-btn').classList.add('active');
    }
    
    // Tool buttons setup
    function setupToolButtons() {
        const tools = ['pencil', 'brush', 'eraser', 'text', 'shape'];
        tools.forEach(tool => {
            const btn = document.getElementById(tool);
            btn.addEventListener('click', () => {
                setTool(tool);
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
    
    // Event listeners setup
    function setupEventListeners() {
        // Color pickers
        document.getElementById('primary-color').addEventListener('input', (e) => {
            currentColor = e.target.value;
        });
        
        document.getElementById('secondary-color').addEventListener('input', (e) => {
            currentSecondaryColor = e.target.value;
        });
        
        // Brush size
        document.getElementById('brush-size').addEventListener('input', (e) => {
            brushSize = e.target.value;
            document.getElementById('brush-size-value').textContent = `${brushSize}px`;
        });
        
        // Paint style
        document.getElementById('paint-style').addEventListener('change', (e) => {
            paintStyle = e.target.value;
        });
        
        // Fill shape
        document.getElementById('fill-shape').addEventListener('change', (e) => {
            fillShape = e.target.checked;
        });
        
        // Text input
        document.getElementById('text-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && textInputActive && currentTextElement) {
                finalizeText();
            }
        });
        
        // Action buttons
        document.getElementById('undo').addEventListener('click', undo);
        document.getElementById('redo').addEventListener('click', redo);
        document.getElementById('clear').addEventListener('click', clearCanvas);
        
        // File actions
        document.getElementById('new-page').addEventListener('click', createNewPage);
        document.getElementById('save-page').addEventListener('click', () => openModal('save'));
        document.getElementById('open-page').addEventListener('click', () => openModal('open'));
        document.getElementById('delete-page').addEventListener('click', deleteCurrentPage);
        document.getElementById('add-page').addEventListener('click', createNewPage);
        
        // Canvas events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch events
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        
        // Modal
        document.querySelector('.close-modal').addEventListener('click', closeModal);
        document.getElementById('modal-action-btn').addEventListener('click', performModalAction);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    redo();
                }
            } else {
                switch (e.key.toLowerCase()) {
                    case 'p': setActiveTool('pencil'); break;
                    case 'b': setActiveTool('brush'); break;
                    case 'e': setActiveTool('eraser'); break;
                    case 't': setActiveTool('text'); break;
                    case 's': setActiveTool('shape'); break;
                }
            }
        });
    }
    
    function setActiveTool(tool) {
        setTool(tool);
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tool).classList.add('active');
    }
    
    // Drawing functions
    function startDrawing(e) {
        if (textInputActive) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        isDrawing = true;
        startX = x;
        startY = y;
        
        if (currentTool === 'text') {
            createTextElement(startX, startY);
            return;
        }
        
        saveState();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        setLineStyle();
        
        if (['pencil', 'brush', 'eraser'].includes(currentTool)) {
            ctx.lineTo(startX, startY);
            ctx.stroke();
        }
    }
    
    function draw(e) {
        if (!isDrawing || textInputActive) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        
        switch (currentTool) {
            case 'pencil':
            case 'brush':
            case 'eraser':
                ctx.lineTo(x, y);
                ctx.stroke();
                break;
            case 'shape':
                redrawCanvas();
                drawShapePreview(startX, startY, x, y);
                break;
        }
    }
    
    function stopDrawing(e) {
        if (!isDrawing || textInputActive) return;
        
        isDrawing = false;
        
        if (currentTool === 'shape') {
            const rect = canvas.getBoundingClientRect();
            const endX = (e.clientX || e.changedTouches[0].clientX) - rect.left;
            const endY = (e.clientY || e.changedTouches[0].clientY) - rect.top;
            
            saveState();
            drawShape(startX, startY, endX, endY);
        }
    }
    
    function setTool(tool) {
        currentTool = tool;
        
        document.getElementById('shape-section').style.display = 
            tool === 'shape' ? 'block' : 'none';
        document.getElementById('text-section').style.display = 
            tool === 'text' ? 'block' : 'none';
        
        switch (tool) {
            case 'pencil':
            case 'brush':
                canvas.style.cursor = 'crosshair';
                break;
            case 'eraser':
                canvas.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 16 16\'><rect width=\'16\' height=\'16\' fill=\'white\'/><rect x=\'2\' y=\'2\' width=\'12\' height=\'12\' fill=\'black\'/></svg>") 8 8, auto';
                break;
            case 'text':
                canvas.style.cursor = 'text';
                break;
            case 'shape':
                canvas.style.cursor = 'crosshair';
                break;
        }
    }
    
    function setLineStyle() {
        ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : currentColor;
        ctx.fillStyle = currentColor;
        ctx.lineWidth = brushSize;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        switch (paintStyle) {
            case 'solid': ctx.setLineDash([]); break;
            case 'dashed': ctx.setLineDash([10, 5]); break;
            case 'dotted': ctx.setLineDash([2, 3]); break;
            case 'double': ctx.lineWidth = brushSize / 2; break;
            case 'groove': ctx.setLineDash([10, 3, 2, 3]); break;
            case 'ridge': ctx.setLineDash([10, 3, 2, 3, 2, 3]); break;
        }
    }
    
    // Shape drawing functions
    function drawShapePreview(startX, startY, endX, endY) {
        ctx.save();
        setLineStyle();
        ctx.globalAlpha = 0.5;
        
        const shapeFunc = shapes.find(s => s.name === currentShape)?.draw;
        if (shapeFunc) shapeFunc(ctx, startX, startY, endX, endY, false);
        
        ctx.restore();
    }
    
    function drawShape(startX, startY, endX, endY) {
        const shapeFunc = shapes.find(s => s.name === currentShape)?.draw;
        if (shapeFunc) shapeFunc(ctx, startX, startY, endX, endY, fillShape);
    }
    
    // Individual shape functions
    function drawRectangle(ctx, x1, y1, x2, y2, fill) {
        const width = x2 - x1;
        const height = y2 - y1;
        if (fill) ctx.fillRect(x1, y1, width, height);
        else ctx.strokeRect(x1, y1, width, height);
    }
    
    function drawCircle(ctx, x1, y1, x2, y2, fill) {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.beginPath();
        ctx.arc(x1, y1, radius, 0, Math.PI * 2);
        fill ? ctx.fill() : ctx.stroke();
    }
    
    function drawTriangle(ctx, x1, y1, x2, y2, fill) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1 * 2 - x2, y2);
        ctx.closePath();
        fill ? ctx.fill() : ctx.stroke();
    }
    
    function drawLine(ctx, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    
    function drawArrow(ctx, x1, y1, x2, y2) {
        drawLine(ctx, x1, y1, x2, y2);
        const headLength = 15;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
    }
    
    function drawStar(ctx, x1, y1, x2, y2, fill) {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const spikes = 5;
        const outerRadius = radius;
        const innerRadius = radius * 0.5;
        
        ctx.beginPath();
        let rot = Math.PI / 2 * 3;
        let x, y;
        const step = Math.PI / spikes;
        
        ctx.moveTo(x1, y1 - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = x1 + Math.cos(rot) * outerRadius;
            y = y1 + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = x1 + Math.cos(rot) * innerRadius;
            y = y1 + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(x1, y1 - outerRadius);
        ctx.closePath();
        fill ? ctx.fill() : ctx.stroke();
    }
    
    // Text functions
    function createTextElement(x, y) {
        if (textInputActive) return;
        
        textInputActive = true;
        textLayer.style.display = 'block';
        
        currentTextElement = document.createElement('div');
        currentTextElement.contentEditable = true;
        currentTextElement.style.position = 'absolute';
        currentTextElement.style.left = `${x}px`;
        currentTextElement.style.top = `${y}px`;
        currentTextElement.style.color = currentColor;
        currentTextElement.style.fontFamily = document.getElementById('font-family').value;
        currentTextElement.style.fontSize = `${document.getElementById('font-size').value}px`;
        currentTextElement.style.minWidth = '20px';
        currentTextElement.style.minHeight = '20px';
        currentTextElement.style.outline = 'none';
        currentTextElement.style.cursor = 'text';
        currentTextElement.style.backgroundColor = 'rgba(255,255,255,0.5)';
        currentTextElement.style.padding = '2px';
        
        textLayer.appendChild(currentTextElement);
        
        setTimeout(() => {
            currentTextElement.focus();
        }, 0);
        
        currentTextElement.addEventListener('blur', finalizeText);
        currentTextElement.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cancelTextInput();
        });
    }
    
    function finalizeText() {
        if (!textInputActive || !currentTextElement) return;
        
        const text = currentTextElement.textContent.trim();
        if (text) {
            saveState();
            ctx.font = `${document.getElementById('font-size').value}px ${document.getElementById('font-family').value}`;
            ctx.textBaseline = 'top';
            ctx.fillStyle = currentColor;
            ctx.fillText(
                text, 
                parseInt(currentTextElement.style.left), 
                parseInt(currentTextElement.style.top)
            );
        }
        
        cancelTextInput();
    }
    
    function cancelTextInput() {
        if (currentTextElement) {
            textLayer.removeChild(currentTextElement);
            currentTextElement = null;
        }
        textInputActive = false;
        textLayer.style.display = 'none';
    }
    
    // Page management
    function createNewPage() {
        saveCurrentPage();
        
        const newPage = {
            id: Date.now().toString(),
            name: `Drawing ${pages.length + 1}`,
            data: null,
            thumbnail: null
        };
        
        pages.push(newPage);
        currentPageIndex = pages.length - 1;
        updatePageThumbnails();
        
        // Initialize with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState();
    }
    
    function saveCurrentPage() {
        if (currentPageIndex === -1 || !pages[currentPageIndex]) return;
        pages[currentPageIndex].data = canvas.toDataURL();
        pages[currentPageIndex].thumbnail = canvas.toDataURL('image/jpeg', 0.1);
    }
    
    function loadPage(index) {
        if (index < 0 || index >= pages.length) return;
        
        saveCurrentPage();
        currentPageIndex = index;
        
        const page = pages[index];
        if (page.data) {
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                drawingHistory = [canvas.toDataURL()];
                historyIndex = 0;
            };
            img.src = page.data;
        } else {
            clearCanvas();
        }
        
        updatePageThumbnails();
    }
    
    function updatePageThumbnails() {
        const container = document.getElementById('page-thumbnails');
        container.innerHTML = '';
        
        pages.forEach((page, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = `page-thumbnail ${index === currentPageIndex ? 'active' : ''}`;
            thumbnail.title = page.name;
            
            const img = document.createElement('img');
            img.src = page.thumbnail || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60" viewBox="0 0 80 60"><rect width="80" height="60" fill="white"/><text x="40" y="30" font-family="Arial" font-size="12" text-anchor="middle" fill="black">New Page</text></svg>';
            thumbnail.appendChild(img);
            thumbnail.addEventListener('click', () => loadPage(index));
            container.appendChild(thumbnail);
        });
    }
    
    function deleteCurrentPage() {
        if (pages.length <= 1) {
            alert("You can't delete the only page.");
            return;
        }
        
        if (confirm("Are you sure you want to delete this page?")) {
            pages.splice(currentPageIndex, 1);
            currentPageIndex = Math.min(currentPageIndex, pages.length - 1);
            loadPage(currentPageIndex);
        }
    }
    
    // Undo/Redo functionality
    function saveState() {
        if (historyIndex < drawingHistory.length - 1) {
            drawingHistory = drawingHistory.slice(0, historyIndex + 1);
        }
        drawingHistory.push(canvas.toDataURL());
        historyIndex++;
    }
    
    function undo() {
        if (historyIndex <= 0) return;
        historyIndex--;
        restoreState();
    }
    
    function redo() {
        if (historyIndex >= drawingHistory.length - 1) return;
        historyIndex++;
        restoreState();
    }
    
    function restoreState() {
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = drawingHistory[historyIndex];
    }
    
    function clearCanvas() {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawingHistory = [canvas.toDataURL()];
        historyIndex = 0;
    }
    
    function redrawCanvas() {
        if (historyIndex >= 0 && drawingHistory[historyIndex]) {
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = drawingHistory[historyIndex];
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    // Modal functions
    function openModal(action) {
        modalAction = action;
        document.getElementById('modal-title').textContent = 
            action === 'save' ? 'Save Drawing' : 'Open Drawing';
        document.getElementById('modal-action-btn').textContent = 
            action === 'save' ? 'Save' : 'Open';
        document.getElementById('page-name').value = pages[currentPageIndex]?.name || '';
        
        const savedPagesList = document.getElementById('saved-pages-list');
        savedPagesList.innerHTML = '';
        
        const savedPages = JSON.parse(localStorage.getItem('paintingAppPages') || '[]');
        if (savedPages.length === 0) {
            savedPagesList.innerHTML = '<div class="saved-page-item">No saved drawings found</div>';
        } else {
            savedPages.forEach(page => {
                const item = document.createElement('div');
                item.className = 'saved-page-item';
                item.textContent = page.name;
                item.addEventListener('click', () => {
                    document.getElementById('page-name').value = page.name;
                });
                savedPagesList.appendChild(item);
            });
        }
        
        document.getElementById('page-modal').style.display = 'block';
    }
    
    function closeModal() {
        document.getElementById('page-modal').style.display = 'none';
    }
    
    function performModalAction() {
        const pageName = document.getElementById('page-name').value.trim();
        if (!pageName) {
            alert('Please enter a drawing name');
            return;
        }
        
        if (modalAction === 'save') {
            savePageToStorage(pageName);
        } else {
            openPageFromStorage(pageName);
        }
        
        closeModal();
    }
    
    function savePageToStorage(pageName) {
        saveCurrentPage();
        
        const pageToSave = {...pages[currentPageIndex], name: pageName};
        let savedPages = JSON.parse(localStorage.getItem('paintingAppPages') || '[]');
        
        const existingIndex = savedPages.findIndex(p => p.name === pageName);
        if (existingIndex !== -1) {
            if (!confirm('A drawing with this name already exists. Overwrite?')) return;
            savedPages[existingIndex] = pageToSave;
        } else {
            savedPages.push(pageToSave);
        }
        
        localStorage.setItem('paintingAppPages', JSON.stringify(savedPages));
        pages[currentPageIndex].name = pageName;
        updatePageThumbnails();
        alert('Drawing saved successfully!');
    }
    
    function openPageFromStorage(pageName) {
        const savedPages = JSON.parse(localStorage.getItem('paintingAppPages') || '[]');
        const pageToOpen = savedPages.find(p => p.name === pageName);
        
        if (!pageToOpen) {
            alert('Drawing not found');
            return;
        }
        
        const existingIndex = pages.findIndex(p => p.id === pageToOpen.id);
        if (existingIndex !== -1) {
            currentPageIndex = existingIndex;
            loadPage(currentPageIndex);
            return;
        }
        
        createNewPage();
        pages[currentPageIndex] = {...pageToOpen};
        
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            drawingHistory = [canvas.toDataURL()];
            historyIndex = 0;
        };
        img.src = pageToOpen.data;
        
        updatePageThumbnails();
    }
    
    // Touch event handlers
    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
    
    function handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
    
    function handleTouchEnd(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const mouseEvent = new MouseEvent('mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }
    
    // Initialize the app
    initApp();
});