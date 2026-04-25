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
        this.isSolutionMode = false;
        this.currentAnimationIndex = 0;
        this.initialColors = null;

        this.initViewer();
        this.initColorPalette();
        this.initColorCounter();
        this.initControls();
        this.initAnimationControls();
        this.updateManualStepDisplay();
    }

    initViewer() {
        const container = document.getElementById('cube-container');
        this.viewer = new CubeViewer(container);

        this.viewer.onStickerClick = (face, colorIndex, sticker) => {
            console.log('App: onStickerClick', face, colorIndex);
            if (this.isSolving || this.isSolutionMode) return;

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
                if (this.isSolutionMode) return;
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
            item.className = 'counter-item';
            item.innerHTML = `
                <div class="counter-swatch" style="background-color: ${color.hex}; border: 2px solid rgba(255,255,255,0.3);"></div>
                <span class="counter-name">${color.name}</span>
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
        const restartBtn = document.getElementById('play-pause-btn');
        const nextBtn = document.getElementById('step-forward-btn');
        const previousBtn = document.getElementById('step-back-btn');

        restartBtn.textContent = 'Restart';
        restartBtn.title = 'Restart solution';
        nextBtn.textContent = 'Next';
        nextBtn.title = 'Next step';
        previousBtn.textContent = 'Previous';
        previousBtn.title = 'Previous step';
        restartBtn.classList.remove('text-xl');
        nextBtn.classList.remove('text-xl');
        previousBtn.classList.remove('text-xl');
        restartBtn.classList.add('text-sm', 'font-semibold');
        nextBtn.classList.add('text-sm', 'font-semibold');
        previousBtn.classList.add('text-sm', 'font-semibold');

        restartBtn.addEventListener('click', () => this.restartSolution());
        nextBtn.addEventListener('click', () => this.stepForward());
        previousBtn.addEventListener('click', () => this.stepBack());

        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');

        speedSlider.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value, 10);
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
            const colors = this.viewer.getColors();
            this.initialColors = JSON.parse(JSON.stringify(colors));

            try {
                this.solution = this.solver.solve(colors);
            } catch (error) {
                console.error('Solver error:', error);
                this.showToast(this.getSolveErrorMessage(error), 'error');
                this.isSolving = false;
                return;
            }

            if (this.solution.length === 0) {
                this.showToast('Cube is already solved!', 'success');
                this.isSolving = false;
                return;
            }

            try {
                this.showSolutionPanel();
                this.showToast(`Solution found: ${this.solution.length} moves`, 'success');
            } catch (error) {
                console.error('Solution display error:', error);
                this.showToast('Solution was found, but the step viewer could not open. Refresh and try again.', 'error');
            }

            this.isSolving = false;
        }, 100);
    }

    getSolveErrorMessage(error) {
        const message = error && typeof error.message === 'string'
            ? error.message.trim()
            : '';

        if (!message) {
            return 'Unable to solve this cube';
        }

        if (message.startsWith('Cube solver')) {
            return message;
        }

        if (message.startsWith('Each face') || message.startsWith('Unknown sticker')) {
            return message;
        }

        return `Unable to solve this cube: ${message}`;
    }

    showSolutionPanel() {
        const panel = document.getElementById('solution-panel');

        panel.classList.remove('hidden');
        document.body.classList.add('solution-visible');
        this.isSolutionMode = true;
        this.updateColorEditingState();

        this.viewer.pauseAnimation();
        this.viewer.resetToInitialState(this.initialColors);
        this.currentAnimationIndex = 0;
        this.updateManualStepDisplay();
    }

    stepForward() {
        if (this.viewer.isAnimating || this.currentAnimationIndex >= this.solution.length) {
            return;
        }

        const move = this.solution[this.currentAnimationIndex];

        this.viewer.animateMove(move, () => {
            this.currentAnimationIndex++;
            this.updateManualStepDisplay();

            if (this.currentAnimationIndex >= this.solution.length) {
                this.showToast('Solution complete!', 'success');
            }
        });
    }

    stepBack() {
        if (this.viewer.isAnimating || this.currentAnimationIndex <= 0) {
            return;
        }

        const previousMove = this.solution[this.currentAnimationIndex - 1];
        const reverseMove = this.viewer.getReverseMove(previousMove);

        this.viewer.animateMove(reverseMove, () => {
            this.currentAnimationIndex--;
            this.updateManualStepDisplay();
        });
    }

    restartSolution() {
        if (this.viewer.isAnimating || !this.initialColors) {
            return;
        }

        this.viewer.pauseAnimation();
        this.viewer.resetToInitialState(this.initialColors);
        this.currentAnimationIndex = 0;
        this.updateManualStepDisplay();
    }

    updateManualStepDisplay() {
        const currentStepEl = document.getElementById('current-step');
        const notationEl = document.getElementById('current-step-notation');
        const hintEl = document.getElementById('current-step-hint');
        const statusEl = document.getElementById('solution-status');
        const previousBtn = document.getElementById('step-back-btn');
        const nextBtn = document.getElementById('step-forward-btn');
        const restartBtn = document.getElementById('play-pause-btn');
        const totalMoves = this.solution.length;
        const isComplete = totalMoves > 0 && this.currentAnimationIndex >= totalMoves;

        if (totalMoves === 0) {
            statusEl.textContent = 'Step 0 of 0';
            currentStepEl.textContent = 'Ready';
            notationEl.textContent = 'Notation will appear here';
            hintEl.textContent = 'Watch the cube animation. Clockwise means while looking directly at that face.';
        } else if (isComplete) {
            statusEl.textContent = `All ${totalMoves} steps completed`;
            currentStepEl.textContent = 'Solved';
            notationEl.textContent = 'All moves completed';
            hintEl.textContent = 'Use Restart to watch the full solution again.';
        } else {
            const move = this.solution[this.currentAnimationIndex];
            statusEl.textContent = `Next step ${this.currentAnimationIndex + 1} of ${totalMoves}`;
            currentStepEl.textContent = this.getMoveInstruction(move);
            notationEl.textContent = `Notation: ${move} - ${this.getMoveNotationExplanation(move)}`;
            hintEl.textContent = 'Watch the cube and press Next when you are ready for the following move.';
        }

        previousBtn.disabled = this.currentAnimationIndex === 0;
        nextBtn.disabled = totalMoves === 0 || isComplete;
        restartBtn.disabled = totalMoves === 0;

        this.updateButtonState(previousBtn);
        this.updateButtonState(nextBtn);
        this.updateButtonState(restartBtn);
    }

    getMoveInstruction(move) {
        const faceNames = {
            U: 'top',
            D: 'bottom',
            F: 'front',
            B: 'back',
            L: 'left',
            R: 'right'
        };
        const face = move[0];
        const faceName = faceNames[face] || face;

        if (move.includes('2')) {
            return `Turn the ${faceName} face 180 degrees.`;
        }

        if (move.includes("'")) {
            return `Turn the ${faceName} face 90 degrees counterclockwise.`;
        }

        return `Turn the ${faceName} face 90 degrees clockwise.`;
    }

    getMoveNotationExplanation(move) {
        const faceLabels = {
            U: 'top',
            D: 'bottom',
            F: 'front',
            B: 'back',
            L: 'left',
            R: 'right'
        };
        const faceLabel = faceLabels[move[0]] || move[0];

        if (move.includes('2')) {
            return `${move[0]} means the ${faceLabel} face, and 2 means turn it twice`;
        }

        if (move.includes("'")) {
            return `${move[0]} means the ${faceLabel} face, and ' means turn it counterclockwise`;
        }

        return `${move[0]} means the ${faceLabel} face`;
    }

    updateButtonState(button) {
        button.classList.toggle('opacity-50', button.disabled);
        button.classList.toggle('cursor-not-allowed', button.disabled);
    }

    reset() {
        this.viewer.pauseAnimation();
        this.viewer.reset();
        this.solution = [];
        this.isSolving = false;
        this.currentAnimationIndex = 0;
        this.initialColors = null;

        document.getElementById('solution-panel').classList.add('hidden');
        document.body.classList.remove('solution-visible');

        this.viewer.setColors(SOLVED_STATE);
        this.updateColorCounter(this.viewer.getColorCounts());
        this.isSolutionMode = false;
        this.updateColorEditingState();
        this.updateManualStepDisplay();
        this.showToast('Cube reset', 'info');
    }

    updateColorEditingState() {
        const palette = document.querySelector('.color-palette');
        const paletteColors = document.querySelectorAll('.palette-color');

        if (palette) {
            palette.classList.toggle('palette-locked', this.isSolutionMode);
        }

        paletteColors.forEach((colorEl) => {
            colorEl.classList.toggle('disabled', this.isSolutionMode);
        });
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
