console.log('CUBE-VIEWER-FILE-LOADED');
class CubeViewer {
    constructor(container) {
        this.container = container;
        this.canvas = document.getElementById('cube-canvas');
        
        this.animationSpeed = 500;
        this.isAnimating = false;
        this.currentMoveIndex = 0;
        this.solution = [];
        this.isPlaying = false;
        
        this.colors = {
            U: Array(9).fill('#FFFFFF'),
            D: Array(9).fill('#FFFFFF'),
            F: Array(9).fill('#FFFFFF'),
            B: Array(9).fill('#FFFFFF'),
            L: Array(9).fill('#FFFFFF'),
            R: Array(9).fill('#FFFFFF')
        };
        
        this.selectedColor = '#FFFFFF';
        this.onStickerClick = null;
        this.onColorChange = null;
        
        this.init();
    }

    init() {
        const rect = this.container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 8);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-5, -5, -5);
        this.scene.add(directionalLight2);
        
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 2;
        
        this.mouseDownPos = { x: 0, y: 0 };
        this.isDragging = false;
        
        this.cubeGroup = new THREE.Group();
        this.scene.add(this.cubeGroup);
        
        this.stickers = [];
        this.buildCube();
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.setupEventListeners();
        this.animate();
    }

    buildCube() {
        this.stickers = [];
        this.cubies = [];
        
        const cubieSize = 0.95;
        const stickerOffset = 0.5;
        const stickerSize = 0.9;
        
        const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
        
        const faceColors = {
            U: '#FFFFFF',
            D: '#FFFFFF',
            F: '#FFFFFF',
            B: '#FFFFFF',
            L: '#FFFFFF',
            R: '#FFFFFF'
        };
        
        const getColorIndex = (face, x, y, z) => {
            let col, row;
            switch (face) {
                case 'U':
                    col = x + 1;
                    row = z + 1;
                    break;
                case 'D':
                    col = x + 1;
                    row = 1 - z;
                    break;
                case 'F':
                    col = x + 1;
                    row = 1 - y;
                    break;
                case 'B':
                    col = 1 - x;
                    row = 1 - y;
                    break;
                case 'L':
                    col = z + 1;
                    row = 1 - y;
                    break;
                case 'R':
                    col = 1 - z;
                    row = 1 - y;
                    break;
            }
            return row * 3 + col;
        };
        
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubieGroup = new THREE.Group();
                    cubieGroup.position.set(x, y, z);
                    
                    const addSticker = (faceName, localPos, rotX, rotY, worldX, worldY, worldZ, colorIndex) => {
                        const faceColor = faceColors[faceName];
                        const material = new THREE.MeshLambertMaterial({ color: new THREE.Color(faceColor) });
                        
                        const sticker = new THREE.Mesh(
                            new THREE.BoxGeometry(stickerSize, stickerSize, 0.15),
                            material
                        );
                        
                        sticker.position.set(localPos.x, localPos.y, localPos.z);
                        sticker.rotation.set(rotX, rotY, 0);
                        
                        sticker.userData = {
                            face: faceName,
                            colorIndex: colorIndex,
                            isSticker: true,
                            worldX: worldX,
                            worldY: worldY,
                            worldZ: worldZ
                        };
                        
                        this.stickers.push(sticker);
                        cubieGroup.add(sticker);
                    };
                    
                    if (y === 1) {
                        const colorIndex = getColorIndex('U', x, y, z);
                        addSticker('U', { x: 0, y: stickerOffset, z: 0 }, -Math.PI / 2, 0, x, 1, z, colorIndex);
                    }
                    
                    if (y === -1) {
                        const colorIndex = getColorIndex('D', x, y, z);
                        addSticker('D', { x: 0, y: -stickerOffset, z: 0 }, Math.PI / 2, 0, x, -1, z, colorIndex);
                    }
                    
                    if (z === 1) {
                        const colorIndex = getColorIndex('F', x, y, z);
                        addSticker('F', { x: 0, y: 0, z: stickerOffset }, 0, 0, x, y, 1, colorIndex);
                    }
                    
                    if (z === -1) {
                        const colorIndex = getColorIndex('B', x, y, z);
                        addSticker('B', { x: 0, y: 0, z: -stickerOffset }, 0, Math.PI, x, y, -1, colorIndex);
                    }
                    
                    if (x === -1) {
                        const colorIndex = getColorIndex('L', x, y, z);
                        addSticker('L', { x: -stickerOffset, y: 0, z: 0 }, 0, -Math.PI / 2, -1, y, z, colorIndex);
                    }
                    
                    if (x === 1) {
                        const colorIndex = getColorIndex('R', x, y, z);
                        addSticker('R', { x: stickerOffset, y: 0, z: 0 }, 0, Math.PI / 2, 1, y, z, colorIndex);
                    }
                    
                    const blackBox = new THREE.Mesh(
                        new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize),
                        blackMaterial
                    );
                    cubieGroup.add(blackBox);
                    
                    this.cubies.push(cubieGroup);
                    this.cubeGroup.add(cubieGroup);
                }
            }
        }
    }

    setupEventListeners() {
        console.log('setupEventListeners called');
        this.canvas.addEventListener('pointerdown', (e) => this.onMouseDown(e));
        window.addEventListener('pointerup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        window.addEventListener('touchend', (e) => this.onTouchEnd(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));
        
        window.addEventListener('resize', () => this.onResize());
    }

    onMouseDown(event) {
        this.mouseDownPos.x = event.clientX;
        this.mouseDownPos.y = event.clientY;
        this.isDragging = false;
        console.log('onMouseDown:', this.mouseDownPos.x, this.mouseDownPos.y);
    }

    onMouseUp(event) {
        const dx = Math.abs(event.clientX - this.mouseDownPos.x);
        const dy = Math.abs(event.clientY - this.mouseDownPos.y);
        console.log('onMouseUp dx, dy:', dx, dy);
        
        if (dx < 5 && dy < 5) {
            this.isDragging = false;
            this.onCanvasClick(event);
        }
    }

    onClick(event) {
        const dx = Math.abs(event.clientX - this.mouseDownPos.x);
        const dy = Math.abs(event.clientY - this.mouseDownPos.y);
        console.log('onClick dx, dy:', dx, dy);
        
        if (dx < 10 && dy < 10) {
            this.onCanvasClick(event);
        }
    }

    onTouchStart(event) {
        if (event.changedTouches.length > 0) {
            this.mouseDownPos.x = event.changedTouches[0].clientX;
            this.mouseDownPos.y = event.changedTouches[0].clientY;
            this.isDragging = false;
        }
    }

    onTouchEnd(event) {
        if (event.changedTouches.length > 0) {
            const dx = Math.abs(event.changedTouches[0].clientX - this.mouseDownPos.x);
            const dy = Math.abs(event.changedTouches[0].clientY - this.mouseDownPos.y);
            
            if (dx < 10 && dy < 10) {
                this.isDragging = false;
                this.onCanvasTouch(event);
            }
        }
    }

    onCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasLeft = rect.left;
        const canvasTop = rect.top;
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;
        
        this.mouse.x = ((event.clientX - canvasLeft) / canvasWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - canvasTop) / canvasHeight) * 2 + 1;
        
        console.log('Click at:', this.mouse.x, this.mouse.y);
        
        this.scene.updateMatrixWorld();
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const allIntersects = this.raycaster.intersectObject(this.cubeGroup, true);
        console.log('All intersects:', allIntersects.length);
        
        const stickerHits = allIntersects.filter(hit => hit.object.userData.isSticker);
        console.log('Sticker hits:', stickerHits.length);
        
        if (stickerHits.length > 0) {
            const clickedSticker = stickerHits[0].object;
            const { face, colorIndex } = clickedSticker.userData;
            console.log('Clicked sticker:', face, colorIndex);
            if (this.onStickerClick) {
                this.onStickerClick(face, colorIndex, clickedSticker);
            }
        }
    }

    onCanvasTouch(event) {
        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const canvasLeft = rect.left;
            const canvasTop = rect.top;
            const canvasWidth = rect.width;
            const canvasHeight = rect.height;
            
            this.mouse.x = ((touch.clientX - canvasLeft) / canvasWidth) * 2 - 1;
            this.mouse.y = -((touch.clientY - canvasTop) / canvasHeight) * 2 + 1;
            
            this.scene.updateMatrixWorld();
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            const allIntersects = this.raycaster.intersectObject(this.cubeGroup, true);
            const stickerHits = allIntersects.filter(hit => hit.object.userData.isSticker);
            
            if (stickerHits.length > 0) {
                const clickedSticker = stickerHits[0].object;
                const { face, colorIndex } = clickedSticker.userData;
                if (this.onStickerClick) {
                    this.onStickerClick(face, colorIndex, clickedSticker);
                }
            }
        }
    }

    onResize() {
        const rect = this.container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    setColor(face, colorIndex, sticker, color) {
        this.colors[face][colorIndex] = color;
        sticker.material.color.set(color);
        
        if (this.onColorChange) {
            this.onColorChange(this.getColorCounts());
        }
    }

    setSelectedColor(color) {
        this.selectedColor = color;
    }

    getColors() {
        const colors = {
            U: Array(9).fill('#FFFFFF'),
            D: Array(9).fill('#FFFFFF'),
            F: Array(9).fill('#FFFFFF'),
            B: Array(9).fill('#FFFFFF'),
            L: Array(9).fill('#FFFFFF'),
            R: Array(9).fill('#FFFFFF')
        };
        
        for (const sticker of this.stickers) {
            const { face, colorIndex } = sticker.userData;
            const hex = sticker.material.color.getHexString();
            colors[face][colorIndex] = '#' + hex.toUpperCase();
        }
        
        return colors;
    }

    getColorCounts() {
        const counts = {};
        const colorSet = new Set();
        
        for (const sticker of this.stickers) {
            const hex = '#' + sticker.material.color.getHexString().toUpperCase();
            counts[hex] = (counts[hex] || 0) + 1;
            colorSet.add(hex);
        }
        
        return counts;
    }

    setColors(colors) {
        this.colors = JSON.parse(JSON.stringify(colors));
        
        for (const sticker of this.stickers) {
            const { face, colorIndex } = sticker.userData;
            const color = this.colors[face][colorIndex];
            sticker.material.color.set(color);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
    }

    rotateFaceCW(face) {
        const temp = [...this.colors[face]];
        this.colors[face][0] = temp[6];
        this.colors[face][1] = temp[3];
        this.colors[face][2] = temp[0];
        this.colors[face][3] = temp[7];
        this.colors[face][4] = temp[4];
        this.colors[face][5] = temp[1];
        this.colors[face][6] = temp[8];
        this.colors[face][7] = temp[5];
        this.colors[face][8] = temp[2];
        
        this.rotateAdjacentCW(face);
        this.updateStickerColors();
    }

    rotateFaceCCW(face) {
        const temp = [...this.colors[face]];
        this.colors[face][0] = temp[2];
        this.colors[face][1] = temp[5];
        this.colors[face][2] = temp[8];
        this.colors[face][3] = temp[1];
        this.colors[face][4] = temp[4];
        this.colors[face][5] = temp[7];
        this.colors[face][6] = temp[0];
        this.colors[face][7] = temp[3];
        this.colors[face][8] = temp[6];
        
        this.rotateAdjacentCCW(face);
        this.updateStickerColors();
    }

    rotateAdjacentCW(face) {
        const temp = [];
        
        switch (face) {
            case 'U':
                temp[0] = this.colors.F[0]; temp[1] = this.colors.F[1]; temp[2] = this.colors.F[2];
                this.colors.F[0] = this.colors.R[0]; this.colors.F[1] = this.colors.R[1]; this.colors.F[2] = this.colors.R[2];
                this.colors.R[0] = this.colors.B[0]; this.colors.R[1] = this.colors.B[1]; this.colors.R[2] = this.colors.B[2];
                this.colors.B[0] = this.colors.L[0]; this.colors.B[1] = this.colors.L[1]; this.colors.B[2] = this.colors.L[2];
                this.colors.L[0] = temp[0]; this.colors.L[1] = temp[1]; this.colors.L[2] = temp[2];
                break;
            case 'D':
                temp[0] = this.colors.F[6]; temp[1] = this.colors.F[7]; temp[2] = this.colors.F[8];
                this.colors.F[6] = this.colors.L[6]; this.colors.F[7] = this.colors.L[7]; this.colors.F[8] = this.colors.L[8];
                this.colors.L[6] = this.colors.B[6]; this.colors.L[7] = this.colors.B[7]; this.colors.L[8] = this.colors.B[8];
                this.colors.B[6] = this.colors.R[6]; this.colors.B[7] = this.colors.R[7]; this.colors.B[8] = this.colors.R[8];
                this.colors.R[6] = temp[0]; this.colors.R[7] = temp[1]; this.colors.R[8] = temp[2];
                break;
            case 'F':
                temp[0] = this.colors.U[6]; temp[1] = this.colors.U[7]; temp[2] = this.colors.U[8];
                this.colors.U[6] = this.colors.L[8]; this.colors.U[7] = this.colors.L[5]; this.colors.U[8] = this.colors.L[2];
                this.colors.L[2] = this.colors.D[0]; this.colors.L[5] = this.colors.D[1]; this.colors.L[8] = this.colors.D[2];
                this.colors.D[0] = this.colors.R[6]; this.colors.D[1] = this.colors.R[3]; this.colors.D[2] = this.colors.R[0];
                this.colors.R[0] = temp[0]; this.colors.R[3] = temp[1]; this.colors.R[6] = temp[2];
                break;
            case 'B':
                temp[0] = this.colors.U[0]; temp[1] = this.colors.U[1]; temp[2] = this.colors.U[2];
                this.colors.U[0] = this.colors.R[2]; this.colors.U[1] = this.colors.R[5]; this.colors.U[2] = this.colors.R[8];
                this.colors.R[2] = this.colors.D[8]; this.colors.R[5] = this.colors.D[7]; this.colors.R[8] = this.colors.D[6];
                this.colors.D[6] = this.colors.L[0]; this.colors.D[7] = this.colors.L[3]; this.colors.D[8] = this.colors.L[6];
                this.colors.L[0] = temp[2]; this.colors.L[3] = temp[1]; this.colors.L[6] = temp[0];
                break;
            case 'L':
                temp[0] = this.colors.U[0]; temp[1] = this.colors.U[3]; temp[2] = this.colors.U[6];
                this.colors.U[0] = this.colors.B[8]; this.colors.U[3] = this.colors.B[5]; this.colors.U[6] = this.colors.B[2];
                this.colors.B[2] = this.colors.D[6]; this.colors.B[5] = this.colors.D[3]; this.colors.B[8] = this.colors.D[0];
                this.colors.D[0] = this.colors.F[0]; this.colors.D[3] = this.colors.F[3]; this.colors.D[6] = this.colors.F[6];
                this.colors.F[0] = temp[0]; this.colors.F[3] = temp[1]; this.colors.F[6] = temp[2];
                break;
            case 'R':
                temp[0] = this.colors.U[2]; temp[1] = this.colors.U[5]; temp[2] = this.colors.U[8];
                this.colors.U[2] = this.colors.F[2]; this.colors.U[5] = this.colors.F[5]; this.colors.U[8] = this.colors.F[8];
                this.colors.F[2] = this.colors.D[2]; this.colors.F[5] = this.colors.D[5]; this.colors.F[8] = this.colors.D[8];
                this.colors.D[2] = this.colors.B[6]; this.colors.D[5] = this.colors.B[3]; this.colors.D[8] = this.colors.B[0];
                this.colors.B[0] = temp[2]; this.colors.B[3] = temp[1]; this.colors.B[6] = temp[0];
                break;
        }
    }

    rotateAdjacentCCW(face) {
        const temp = [];
        
        switch (face) {
            case 'U':
                temp[0] = this.colors.F[0]; temp[1] = this.colors.F[1]; temp[2] = this.colors.F[2];
                this.colors.F[0] = this.colors.L[0]; this.colors.F[1] = this.colors.L[1]; this.colors.F[2] = this.colors.L[2];
                this.colors.L[0] = this.colors.B[0]; this.colors.L[1] = this.colors.B[1]; this.colors.L[2] = this.colors.B[2];
                this.colors.B[0] = this.colors.R[0]; this.colors.B[1] = this.colors.R[1]; this.colors.B[2] = this.colors.R[2];
                this.colors.R[0] = temp[0]; this.colors.R[1] = temp[1]; this.colors.R[2] = temp[2];
                break;
            case 'D':
                temp[0] = this.colors.F[6]; temp[1] = this.colors.F[7]; temp[2] = this.colors.F[8];
                this.colors.F[6] = this.colors.R[6]; this.colors.F[7] = this.colors.R[7]; this.colors.F[8] = this.colors.R[8];
                this.colors.R[6] = this.colors.B[6]; this.colors.R[7] = this.colors.B[7]; this.colors.R[8] = this.colors.B[8];
                this.colors.B[6] = this.colors.L[6]; this.colors.B[7] = this.colors.L[7]; this.colors.B[8] = this.colors.L[8];
                this.colors.L[6] = temp[0]; this.colors.L[7] = temp[1]; this.colors.L[8] = temp[2];
                break;
            case 'F':
                temp[0] = this.colors.U[6]; temp[1] = this.colors.U[7]; temp[2] = this.colors.U[8];
                this.colors.U[6] = this.colors.R[0]; this.colors.U[7] = this.colors.R[3]; this.colors.U[8] = this.colors.R[6];
                this.colors.R[0] = this.colors.D[2]; this.colors.R[3] = this.colors.D[1]; this.colors.R[6] = this.colors.D[0];
                this.colors.D[0] = this.colors.L[2]; this.colors.D[1] = this.colors.L[5]; this.colors.D[2] = this.colors.L[8];
                this.colors.L[2] = temp[2]; this.colors.L[5] = temp[1]; this.colors.L[8] = temp[0];
                break;
            case 'B':
                temp[0] = this.colors.U[0]; temp[1] = this.colors.U[1]; temp[2] = this.colors.U[2];
                this.colors.U[0] = this.colors.L[6]; this.colors.U[1] = this.colors.L[3]; this.colors.U[2] = this.colors.L[0];
                this.colors.L[0] = this.colors.D[6]; this.colors.L[3] = this.colors.D[7]; this.colors.L[6] = this.colors.D[8];
                this.colors.D[6] = this.colors.R[8]; this.colors.D[7] = this.colors.R[5]; this.colors.D[8] = this.colors.R[2];
                this.colors.R[2] = temp[0]; this.colors.R[5] = temp[1]; this.colors.R[8] = temp[2];
                break;
            case 'L':
                temp[0] = this.colors.U[0]; temp[1] = this.colors.U[3]; temp[2] = this.colors.U[6];
                this.colors.U[0] = this.colors.F[0]; this.colors.U[3] = this.colors.F[3]; this.colors.U[6] = this.colors.F[6];
                this.colors.F[0] = this.colors.D[0]; this.colors.F[3] = this.colors.D[3]; this.colors.F[6] = this.colors.D[6];
                this.colors.D[0] = this.colors.B[8]; this.colors.D[3] = this.colors.B[5]; this.colors.D[6] = this.colors.B[2];
                this.colors.B[2] = temp[2]; this.colors.B[5] = temp[1]; this.colors.B[8] = temp[0];
                break;
            case 'R':
                temp[0] = this.colors.U[2]; temp[1] = this.colors.U[5]; temp[2] = this.colors.U[8];
                this.colors.U[2] = this.colors.B[6]; this.colors.U[5] = this.colors.B[3]; this.colors.U[8] = this.colors.B[0];
                this.colors.B[0] = this.colors.D[8]; this.colors.B[3] = this.colors.D[5]; this.colors.B[6] = this.colors.D[2];
                this.colors.D[2] = this.colors.F[2]; this.colors.D[5] = this.colors.F[5]; this.colors.D[8] = this.colors.F[8];
                this.colors.F[2] = temp[0]; this.colors.F[5] = temp[1]; this.colors.F[8] = temp[2];
                break;
        }
    }

    updateStickerColors() {
        for (const sticker of this.stickers) {
            const color = this.colors[sticker.userData.face][sticker.userData.colorIndex];
            sticker.material.color.set(color);
        }
    }

    animateMove(move, onComplete) {
        this.isAnimating = true;
        const duration = this.animationSpeed;
        const startTime = performance.now();
        const face = move[0];
        const prime = move.includes("'");
        
        const rotatingGroup = new THREE.Group();
        this.scene.add(rotatingGroup);
        
        const faceCubies = this.cubies.filter(c => {
            const pos = c.position;
            switch (face) {
                case 'U': return pos.y > 0.5;
                case 'D': return pos.y < -0.5;
                case 'F': return pos.z > 0.5;
                case 'B': return pos.z < -0.5;
                case 'L': return pos.x < -0.5;
                case 'R': return pos.x > 0.5;
            }
            return false;
        });
        
        faceCubies.forEach(c => {
            rotatingGroup.attach(c);
        });
        
        const targetRotation = prime ? Math.PI / 2 : -Math.PI / 2;
        
        const axis = new THREE.Vector3();
        switch (face) {
            case 'U': axis.set(0, 1, 0); break;
            case 'D': axis.set(0, -1, 0); break;
            case 'F': axis.set(0, 0, 1); break;
            case 'B': axis.set(0, 0, -1); break;
            case 'L': axis.set(-1, 0, 0); break;
            case 'R': axis.set(1, 0, 0); break;
        }
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeInOutCubic(progress);
            
            rotatingGroup.setRotationFromAxisAngle(axis, targetRotation * eased);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                faceCubies.forEach(c => {
                    this.cubeGroup.attach(c);
                });
                this.scene.remove(rotatingGroup);
                
                if (prime) {
                    this.rotateFaceCCW(face);
                } else {
                    this.rotateFaceCW(face);
                }
                
                this.isAnimating = false;
                if (onComplete) onComplete();
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    animateMoveSync(move) {
        const face = move[0];
        const prime = move.includes("'");
        const double = move.includes("2");
        const times = double ? 2 : 1;
        
        for (let i = 0; i < times; i++) {
            if (prime) {
                this.rotateFaceCCW(face);
            } else {
                this.rotateFaceCW(face);
            }
        }
    }

    playSolution(solution, onStep, onComplete) {
        this.solution = solution;
        this.currentMoveIndex = 0;
        this.isPlaying = true;
        this.playNextMove(onStep, onComplete);
    }

    playNextMove(onStep, onComplete) {
        if (!this.isPlaying || this.currentMoveIndex >= this.solution.length) {
            this.isPlaying = false;
            if (onComplete) onComplete();
            return;
        }
        
        const move = this.solution[this.currentMoveIndex];
        
        if (onStep) onStep(this.currentMoveIndex, move);
        
        this.animateMove(move, () => {
            this.currentMoveIndex++;
            setTimeout(() => {
                this.playNextMove(onStep, onComplete);
            }, 100);
        });
    }

    pauseAnimation() {
        this.isPlaying = false;
    }

    stepForward(onStep, onComplete) {
        if (this.currentMoveIndex >= this.solution.length) return;
        
        const move = this.solution[this.currentMoveIndex];
        
        if (onStep) onStep(this.currentMoveIndex, move);
        
        this.animateMove(move, () => {
            this.currentMoveIndex++;
            if (this.currentMoveIndex >= this.solution.length && onComplete) {
                onComplete();
            }
        });
    }

    stepBackward(onComplete) {
        if (this.currentMoveIndex <= 0) return;
        
        this.currentMoveIndex--;
        const move = this.solution[this.currentMoveIndex];
        const reverseMove = this.getReverseMove(move);
        
        this.animateMove(reverseMove, () => {
            if (onComplete) onComplete();
        });
    }

    getReverseMove(move) {
        if (move.includes("'")) {
            return move.replace("'", "");
        } else if (move.includes("2")) {
            return move;
        } else {
            return move + "'";
        }
    }

    reset() {
        this.pauseAnimation();
        this.currentMoveIndex = 0;
        this.solution = [];
        this.isPlaying = false;
    }

    resetToInitialState(initialColors) {
        this.pauseAnimation();
        this.currentMoveIndex = 0;
        this.solution = [];
        this.isPlaying = false;
        
        this.colors = JSON.parse(JSON.stringify(initialColors));
        this.updateStickerColors();
    }
}
