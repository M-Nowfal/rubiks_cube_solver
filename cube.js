(function (globalScope) {
    const FACELET_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];
    const SHORT_SEARCH_MOVES = [
        'U', "U'", 'U2',
        'R', "R'", 'R2',
        'F', "F'", 'F2',
        'D', "D'", 'D2',
        'L', "L'", 'L2',
        'B', "B'", 'B2'
    ];

    class CubeSolver {
        constructor() {
            this.engine = this.resolveEngine();
            this.isInitialized = false;
            this.shortSearchDepth = 6;
        }

        resolveEngine() {
            if (typeof globalScope.Cube !== 'undefined') {
                return this.validateEngine(globalScope.Cube);
            }

            if (typeof require === 'function') {
                return this.validateEngine(require('cubejs'));
            }

            throw new Error('Cube solver library is not available');
        }

        initializeSolver() {
            if (this.isInitialized) {
                return;
            }

            if (typeof this.engine.initSolver !== 'function') {
                throw new Error('Cube solver support files did not load. Refresh the page and try again.');
            }

            this.engine.initSolver();
            this.isInitialized = true;
        }

        solve(colors) {
            const normalizedColors = this.createColorState(colors);

            if (this.isSolvedState(normalizedColors)) {
                return [];
            }

            const shortSolution = this.findShortSolution(normalizedColors, this.shortSearchDepth);
            if (shortSolution) {
                return shortSolution;
            }

            const cube = this.createCube(normalizedColors);

            if (cube.isSolved()) {
                return [];
            }

            this.initializeSolver();

            if (typeof cube.solve !== 'function') {
                throw new Error('Cube solver is not ready yet. Refresh the page and try again.');
            }

            const algorithm = cube.solve();
            return algorithm.trim().split(/\s+/).filter(Boolean);
        }

        createCube(colors) {
            return this.engine.fromString(this.toFaceletString(colors));
        }

        createColorState(colors) {
            const state = {};
            for (const face of FACELET_ORDER) {
                state[face] = colors[face].map((stickerColor) => this.normalizeColor(stickerColor));
            }
            return state;
        }

        toFaceletString(colors) {
            const colorToFace = new Map();

            for (const face of FACELET_ORDER) {
                const centerColor = this.normalizeColor(colors[face][4]);

                if (colorToFace.has(centerColor)) {
                    throw new Error('Each face must have a unique center color');
                }

                colorToFace.set(centerColor, face);
            }

            return FACELET_ORDER.map((face) => {
                return colors[face].map((stickerColor) => {
                    const mappedFace = colorToFace.get(this.normalizeColor(stickerColor));

                    if (!mappedFace) {
                        throw new Error(`Unknown sticker color on face ${face}`);
                    }

                    return mappedFace;
                }).join('');
            }).join('');
        }

        normalizeColor(color) {
            return String(color).trim().toUpperCase();
        }

        findShortSolution(state, maxDepth) {
            for (let depth = 1; depth <= maxDepth; depth++) {
                const path = [];
                const result = this.searchShortSolution(state, depth, path, null);
                if (result) {
                    return result;
                }
            }

            return null;
        }

        searchShortSolution(state, remainingDepth, path, previousFace) {
            if (this.isSolvedState(state)) {
                return path.slice();
            }

            if (remainingDepth === 0) {
                return null;
            }

            for (const move of SHORT_SEARCH_MOVES) {
                const face = move[0];
                if (this.shouldSkipMove(face, previousFace)) {
                    continue;
                }

                this.applyMove(state, move);
                path.push(move);

                const result = this.searchShortSolution(state, remainingDepth - 1, path, face);
                if (result) {
                    return result;
                }

                path.pop();
                this.applyMove(state, this.getInverseMove(move));
            }

            return null;
        }

        shouldSkipMove(face, previousFace) {
            if (!previousFace) {
                return false;
            }

            if (face === previousFace) {
                return true;
            }

            return this.getAxis(face) === this.getAxis(previousFace)
                && this.getAxisOrder(face) < this.getAxisOrder(previousFace);
        }

        getAxis(face) {
            if (face === 'U' || face === 'D') return 'UD';
            if (face === 'F' || face === 'B') return 'FB';
            return 'LR';
        }

        getAxisOrder(face) {
            const order = { U: 0, D: 1, F: 0, B: 1, L: 0, R: 1 };
            return order[face];
        }

        getInverseMove(move) {
            if (move.includes('2')) {
                return move;
            }

            if (move.includes("'")) {
                return move[0];
            }

            return `${move[0]}'`;
        }

        isSolvedState(state) {
            for (const face of FACELET_ORDER) {
                const centerColor = state[face][4];
                for (let i = 0; i < 9; i++) {
                    if (state[face][i] !== centerColor) {
                        return false;
                    }
                }
            }

            return true;
        }

        applyMove(state, move) {
            const face = move[0];
            const isPrime = move.includes("'");
            const turns = move.includes('2') ? 2 : 1;

            for (let i = 0; i < turns; i++) {
                if (isPrime) {
                    this.rotateFaceCCW(state[face]);
                    this.rotateAdjacentCCW(state, face);
                } else {
                    this.rotateFaceCW(state[face]);
                    this.rotateAdjacentCW(state, face);
                }
            }
        }

        rotateFaceCW(faceArray) {
            const temp = [...faceArray];
            faceArray[0] = temp[6]; faceArray[1] = temp[3]; faceArray[2] = temp[0];
            faceArray[3] = temp[7]; faceArray[4] = temp[4]; faceArray[5] = temp[1];
            faceArray[6] = temp[8]; faceArray[7] = temp[5]; faceArray[8] = temp[2];
        }

        rotateFaceCCW(faceArray) {
            const temp = [...faceArray];
            faceArray[0] = temp[2]; faceArray[1] = temp[5]; faceArray[2] = temp[8];
            faceArray[3] = temp[1]; faceArray[4] = temp[4]; faceArray[5] = temp[7];
            faceArray[6] = temp[0]; faceArray[7] = temp[3]; faceArray[8] = temp[6];
        }

        rotateAdjacentCW(state, face) {
            let temp = [];

            switch (face) {
                case 'U':
                    temp = [state.F[0], state.F[1], state.F[2]];
                    state.F[0] = state.R[0]; state.F[1] = state.R[1]; state.F[2] = state.R[2];
                    state.R[0] = state.B[0]; state.R[1] = state.B[1]; state.R[2] = state.B[2];
                    state.B[0] = state.L[0]; state.B[1] = state.L[1]; state.B[2] = state.L[2];
                    state.L[0] = temp[0]; state.L[1] = temp[1]; state.L[2] = temp[2];
                    break;
                case 'D':
                    temp = [state.F[6], state.F[7], state.F[8]];
                    state.F[6] = state.L[6]; state.F[7] = state.L[7]; state.F[8] = state.L[8];
                    state.L[6] = state.B[6]; state.L[7] = state.B[7]; state.L[8] = state.B[8];
                    state.B[6] = state.R[6]; state.B[7] = state.R[7]; state.B[8] = state.R[8];
                    state.R[6] = temp[0]; state.R[7] = temp[1]; state.R[8] = temp[2];
                    break;
                case 'F':
                    temp = [state.U[6], state.U[7], state.U[8]];
                    state.U[6] = state.L[8]; state.U[7] = state.L[5]; state.U[8] = state.L[2];
                    state.L[2] = state.D[0]; state.L[5] = state.D[1]; state.L[8] = state.D[2];
                    state.D[0] = state.R[6]; state.D[1] = state.R[3]; state.D[2] = state.R[0];
                    state.R[0] = temp[0]; state.R[3] = temp[1]; state.R[6] = temp[2];
                    break;
                case 'B':
                    temp = [state.U[0], state.U[1], state.U[2]];
                    state.U[0] = state.R[2]; state.U[1] = state.R[5]; state.U[2] = state.R[8];
                    state.R[2] = state.D[8]; state.R[5] = state.D[7]; state.R[8] = state.D[6];
                    state.D[6] = state.L[0]; state.D[7] = state.L[3]; state.D[8] = state.L[6];
                    state.L[0] = temp[2]; state.L[3] = temp[1]; state.L[6] = temp[0];
                    break;
                case 'L':
                    temp = [state.U[0], state.U[3], state.U[6]];
                    state.U[0] = state.B[8]; state.U[3] = state.B[5]; state.U[6] = state.B[2];
                    state.B[2] = state.D[6]; state.B[5] = state.D[3]; state.B[8] = state.D[0];
                    state.D[0] = state.F[0]; state.D[3] = state.F[3]; state.D[6] = state.F[6];
                    state.F[0] = temp[0]; state.F[3] = temp[1]; state.F[6] = temp[2];
                    break;
                case 'R':
                    temp = [state.U[2], state.U[5], state.U[8]];
                    state.U[2] = state.F[2]; state.U[5] = state.F[5]; state.U[8] = state.F[8];
                    state.F[2] = state.D[2]; state.F[5] = state.D[5]; state.F[8] = state.D[8];
                    state.D[2] = state.B[6]; state.D[5] = state.B[3]; state.D[8] = state.B[0];
                    state.B[0] = temp[2]; state.B[3] = temp[1]; state.B[6] = temp[0];
                    break;
            }
        }

        rotateAdjacentCCW(state, face) {
            let temp = [];

            switch (face) {
                case 'U':
                    temp = [state.F[0], state.F[1], state.F[2]];
                    state.F[0] = state.L[0]; state.F[1] = state.L[1]; state.F[2] = state.L[2];
                    state.L[0] = state.B[0]; state.L[1] = state.B[1]; state.L[2] = state.B[2];
                    state.B[0] = state.R[0]; state.B[1] = state.R[1]; state.B[2] = state.R[2];
                    state.R[0] = temp[0]; state.R[1] = temp[1]; state.R[2] = temp[2];
                    break;
                case 'D':
                    temp = [state.F[6], state.F[7], state.F[8]];
                    state.F[6] = state.R[6]; state.F[7] = state.R[7]; state.F[8] = state.R[8];
                    state.R[6] = state.B[6]; state.R[7] = state.B[7]; state.R[8] = state.B[8];
                    state.B[6] = state.L[6]; state.B[7] = state.L[7]; state.B[8] = state.L[8];
                    state.L[6] = temp[0]; state.L[7] = temp[1]; state.L[8] = temp[2];
                    break;
                case 'F':
                    temp = [state.U[6], state.U[7], state.U[8]];
                    state.U[6] = state.R[0]; state.U[7] = state.R[3]; state.U[8] = state.R[6];
                    state.R[0] = state.D[2]; state.R[3] = state.D[1]; state.R[6] = state.D[0];
                    state.D[0] = state.L[2]; state.D[1] = state.L[5]; state.D[2] = state.L[8];
                    state.L[2] = temp[2]; state.L[5] = temp[1]; state.L[8] = temp[0];
                    break;
                case 'B':
                    temp = [state.U[0], state.U[1], state.U[2]];
                    state.U[0] = state.L[6]; state.U[1] = state.L[3]; state.U[2] = state.L[0];
                    state.L[0] = state.D[6]; state.L[3] = state.D[7]; state.L[6] = state.D[8];
                    state.D[6] = state.R[8]; state.D[7] = state.R[5]; state.D[8] = state.R[2];
                    state.R[2] = temp[0]; state.R[5] = temp[1]; state.R[8] = temp[2];
                    break;
                case 'L':
                    temp = [state.U[0], state.U[3], state.U[6]];
                    state.U[0] = state.F[0]; state.U[3] = state.F[3]; state.U[6] = state.F[6];
                    state.F[0] = state.D[0]; state.F[3] = state.D[3]; state.F[6] = state.D[6];
                    state.D[0] = state.B[8]; state.D[3] = state.B[5]; state.D[6] = state.B[2];
                    state.B[2] = temp[2]; state.B[5] = temp[1]; state.B[8] = temp[0];
                    break;
                case 'R':
                    temp = [state.U[2], state.U[5], state.U[8]];
                    state.U[2] = state.B[6]; state.U[5] = state.B[3]; state.U[8] = state.B[0];
                    state.B[0] = state.D[8]; state.B[3] = state.D[5]; state.B[6] = state.D[2];
                    state.D[2] = state.F[2]; state.D[5] = state.F[5]; state.D[8] = state.F[8];
                    state.F[2] = temp[0]; state.F[5] = temp[1]; state.F[8] = temp[2];
                    break;
            }
        }

        validateEngine(engine) {
            if (!engine || typeof engine.fromString !== 'function') {
                throw new Error('Cube solver core failed to load. Refresh the page and try again.');
            }

            return engine;
        }
    }

    globalScope.CubeSolver = CubeSolver;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { CubeSolver };
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
