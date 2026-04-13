console.log('APP-FILE-LOADED');
const COLORS = [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Red', hex: '#FF0000' },
    { name: 'Blue', hex: '#0000FF' },
    { name: 'Orange', hex: '#FF8800' },
    { name: 'Green', hex: '#00AA00' },
    { name: 'Yellow', hex: '#FFFF00' }
];

const SOLVED_STATE = {
    U: Array(9).fill('#FFFFFF'),
    D: Array(9).fill('#FFFFFF'),
    F: Array(9).fill('#FFFFFF'),
    B: Array(9).fill('#FFFFFF'),
    L: Array(9).fill('#FFFFFF'),
    R: Array(9).fill('#FFFFFF')
};

class RubiksCubeApp {
    constructor() {
        this.solver = new CubeSolver();
        this.viewer = null;
        this.selectedColorIndex = 0;
        this.solution = [];
        this.isSolving = false;
        this.currentAnimationIndex = 0;
        this.initialColors = null;
        
        this.initViewer();
        this.initColorPalette();
        this.initColorCounter();
        this.initControls();
        this.initAnimationControls();
    }

    initViewer() {
        const container = document.getElementById('cube-container');
        this.viewer = new CubeViewer(container);
        
        this.viewer.onStickerClick = (face, colorIndex, sticker) => {
            console.log('App: onStickerClick', face, colorIndex);
            if (this.isSolving) return;
            
            const color = COLORS[this.selectedColorIndex].hex;
            this.viewer.setColor(face, colorIndex, sticker, color);
        };
        
        this.viewer.onColorChange = (counts) => {
            this.updateColorCounter(counts);
        };
        
        this.updateColorCounter(this.viewer.getColorCounts());
    }

    initColorPalette() {
        const palette = document.getElementById('color-palette');
        palette.innerHTML = '';
        
        COLORS.forEach((color, index) => {
            const colorEl = document.createElement('div');
            colorEl.className = 'palette-color';
            colorEl.style.backgroundColor = color.hex;
            colorEl.title = color.name;
            
            if (index === 0) colorEl.classList.add('selected');
            
            colorEl.addEventListener('click', () => {
                document.querySelectorAll('.palette-color').forEach(el => el.classList.remove('selected'));
                colorEl.classList.add('selected');
                this.selectedColorIndex = index;
                this.viewer.setSelectedColor(color.hex);
            });
            
            palette.appendChild(colorEl);
        });
    }

    initColorCounter() {
        const display = document.getElementById('counter-display');
        display.innerHTML = '';
        
        COLORS.forEach(color => {
            const item = document.createElement('div');
            item.className = 'counter-item flex items-center gap-2 bg-gray-700 rounded-lg p-2';
            item.innerHTML = `
                <div class="w-6 h-6 rounded" style="background-color: ${color.hex}; border: 2px solid rgba(255,255,255,0.3);"></div>
                <span class="text-sm text-gray-300">${color.name}</span>
                <span class="counter-value text-sm font-bold text-white ml-auto" data-color="${color.hex.toUpperCase()}">0</span>
            `;
            display.appendChild(item);
        });
    }

    updateColorCounter(counts) {
        document.querySelectorAll('.counter-value').forEach(el => {
            const colorHex = el.dataset.color;
            el.textContent = counts[colorHex] || 0;
        });
    }

    initControls() {
        document.getElementById('solve-btn').addEventListener('click', () => this.solve());
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
    }

    initAnimationControls() {
        document.getElementById('play-pause-btn').addEventListener('click', () => this.togglePlay());
        document.getElementById('step-forward-btn').addEventListener('click', () => this.stepForward());
        document.getElementById('step-back-btn').addEventListener('click', () => this.stepBack());
        
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        
        speedSlider.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            speedValue.textContent = `${speed}ms`;
            this.viewer.setAnimationSpeed(speed);
        });
    }

    validateCube() {
        const colors = this.viewer.getColors();
        const colorCounts = {};
        const centerColors = [];
        
        for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
            const center = colors[face][4];
            if (!center) {
                return { valid: false, error: 'Empty center stickers' };
            }
            centerColors.push(center);
        }
        
        const uniqueCenters = new Set(centerColors);
        if (uniqueCenters.size !== 6) {
            return { valid: false, error: 'Each face must have a unique center color' };
        }
        
        let totalStickers = 0;
        for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
            for (let i = 0; i < 9; i++) {
                const color = colors[face][i];
                if (!color) {
                    return { valid: false, error: 'Please color all stickers' };
                }
                colorCounts[color.toUpperCase()] = (colorCounts[color.toUpperCase()] || 0) + 1;
                totalStickers++;
            }
        }
        
        for (const color of Object.keys(colorCounts)) {
            if (colorCounts[color] !== 9) {
                return { valid: false, error: `${color} appears ${colorCounts[color]} times (must be exactly 9)` };
            }
        }
        
        if (totalStickers !== 54) {
            return { valid: false, error: 'Not all stickers are colored' };
        }
        
        return { valid: true };
    }

    solve() {
        if (this.isSolving) return;
        
        const validation = this.validateCube();
        if (!validation.valid) {
            this.showToast(validation.error, 'error');
            return;
        }
        
        this.isSolving = true;
        this.showToast('Calculating solution...', 'info');
        
        setTimeout(() => {
            try {
                const colors = this.viewer.getColors();
                this.initialColors = JSON.parse(JSON.stringify(colors));
                
                this.solution = this.solver.solve(colors);
                
                if (this.solution.length === 0) {
                    this.showToast('Cube is already solved!', 'success');
                    this.isSolving = false;
                    return;
                }
                
                this.showSolutionPanel();
                this.showToast(`Solution found: ${this.solution.length} moves`, 'success');
                
            } catch (error) {
                console.error('Solver error:', error);
                this.showToast('Unable to solve this cube', 'error');
            }
            
            this.isSolving = false;
        }, 100);
    }

    showSolutionPanel() {
        const panel = document.getElementById('solution-panel');
        const stepsContainer = document.getElementById('solution-steps');
        const currentStepEl = document.getElementById('current-step');
        
        panel.classList.remove('hidden');
        stepsContainer.innerHTML = '';
        currentStepEl.textContent = '';
        
        const groupedMoves = this.groupMoves(this.solution);
        
        groupedMoves.forEach((group, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = 'step-item';
            stepEl.textContent = group;
            stepEl.dataset.index = index;
            stepEl.addEventListener('click', () => {
                this.jumpToStep(index);
            });
            stepsContainer.appendChild(stepEl);
        });
        
        this.viewer.resetToInitialState(this.initialColors);
        this.currentAnimationIndex = 0;
    }

    groupMoves(moves) {
        const groups = [];
        let currentGroup = [];
        
        moves.forEach(move => {
            if (currentGroup.length === 0) {
                currentGroup.push(move);
            } else {
                const lastMove = currentGroup[currentGroup.length - 1];
                
                if (move[0] === lastMove[0] && move.length === lastMove.length) {
                    currentGroup.push(move);
                    if (currentGroup.length > 3) {
                        groups.push(currentGroup.join(' '));
                        currentGroup = [];
                    }
                } else {
                    groups.push(currentGroup.join(' '));
                    currentGroup = [move];
                }
            }
        });
        
        if (currentGroup.length > 0) {
            groups.push(currentGroup.join(' '));
        }
        
        return groups;
    }

    jumpToStep(index) {
        this.viewer.pauseAnimation();
        this.viewer.resetToInitialState(this.initialColors);
        this.currentAnimationIndex = 0;
        
        const currentGrouped = this.groupMoves(this.solution);
        
        for (let i = 0; i < index; i++) {
            const moves = currentGrouped[i].split(' ');
            for (const m of moves) {
                this.viewer.animateMoveSync(m);
                this.currentAnimationIndex++;
            }
        }
        
        this.updateStepHighlight(index);
        this.updateCurrentStepDisplay(index);
    }

    togglePlay() {
        const btn = document.getElementById('play-pause-btn');
        
        if (this.viewer.isPlaying) {
            this.viewer.pauseAnimation();
            btn.textContent = '▶';
        } else {
            btn.textContent = '⏸';
            this.playFromCurrent();
        }
    }

    playFromCurrent() {
        const remainingMoves = this.solution.slice(this.currentAnimationIndex);
        
        if (remainingMoves.length === 0) {
            document.getElementById('play-pause-btn').textContent = '▶';
            this.showToast('Solution complete!', 'success');
            return;
        }
        
        this.viewer.playSolution(remainingMoves, (localIndex, move) => {
            const globalIndex = this.currentAnimationIndex + localIndex;
            this.updateStepHighlightFromMoveIndex(globalIndex);
        }, () => {
            this.currentAnimationIndex = this.solution.length;
            document.getElementById('play-pause-btn').textContent = '▶';
            this.showToast('Solution complete!', 'success');
        });
    }

    stepForward() {
        this.viewer.pauseAnimation();
        document.getElementById('play-pause-btn').textContent = '▶';
        
        if (this.currentAnimationIndex >= this.solution.length) return;
        
        const move = this.solution[this.currentAnimationIndex];
        
        this.viewer.animateMove(move, () => {
            this.currentAnimationIndex++;
            this.updateStepHighlightFromMoveIndex(this.currentAnimationIndex);
        });
    }

    stepBack() {
        this.viewer.pauseAnimation();
        document.getElementById('play-pause-btn').textContent = '▶';
        
        if (this.currentAnimationIndex <= 0) return;
        
        this.viewer.stepBackward(() => {
            this.currentAnimationIndex--;
            this.updateStepHighlightFromMoveIndex(this.currentAnimationIndex);
        });
    }

    updateStepHighlightFromMoveIndex(moveIndex) {
        const steps = document.querySelectorAll('.step-item');
        let stepIndex = 0;
        let count = 0;
        
        for (const step of steps) {
            const moves = step.textContent.split(' ');
            if (count + moves.length > moveIndex) {
                stepIndex = Array.from(steps).indexOf(step);
                break;
            }
            count += moves.length;
        }
        
        this.updateStepHighlight(stepIndex);
        this.updateCurrentStepDisplay(moveIndex);
    }

    updateStepHighlight(activeIndex) {
        const steps = document.querySelectorAll('.step-item');
        steps.forEach((step, index) => {
            step.classList.remove('current');
            if (index < activeIndex) {
                step.classList.add('completed');
            } else {
                step.classList.remove('completed');
            }
        });
        if (steps[activeIndex]) {
            steps[activeIndex].classList.add('current');
            steps[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    updateCurrentStepDisplay(moveIndex) {
        const currentStepEl = document.getElementById('current-step');
        const steps = document.querySelectorAll('.step-item');
        let currentGroupIndex = 0;
        let count = 0;
        
        for (const step of steps) {
            const moves = step.textContent.split(' ');
            if (count + moves.length > moveIndex) {
                currentGroupIndex = Array.from(steps).indexOf(step);
                break;
            }
            count += moves.length;
        }
        
        if (steps[currentGroupIndex]) {
            currentStepEl.textContent = steps[currentGroupIndex].textContent;
        }
    }

    reset() {
        this.viewer.pauseAnimation();
        this.viewer.reset();
        this.solution = [];
        this.isSolving = false;
        this.currentAnimationIndex = 0;
        this.initialColors = null;
        
        document.getElementById('solution-panel').classList.add('hidden');
        document.getElementById('play-pause-btn').textContent = '▶';
        
        this.viewer.setColors(SOLVED_STATE);
        this.updateColorCounter(this.viewer.getColorCounts());
        this.showToast('Cube reset', 'info');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RubiksCubeApp();
});
