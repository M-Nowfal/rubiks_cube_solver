class CubeSolver {
    constructor() {
        this.MAX_TOTAL_MOVES = 2000;
        this.MAX_STEP_MOVES = 200;
        this.DEBUG = true;
    }

    solve(colors) {
        const cube = this.createCubeState(colors);
        const solution = [];
        
        try {
            // Step 1: Bottom Cross (D face)
            this.solveBottomCross(cube, solution);
            
            // Step 2: Bottom Corners (First Layer)
            this.solveBottomCorners(cube, solution);
            
            // Step 3: Middle Layer (Second Layer)
            this.solveMiddleLayer(cube, solution);
            
            // Step 4: Top Cross (OLL Edge Orientation)
            this.solveTopCross(cube, solution);
            
            // Step 5: Top Corners (OLL Corner Orientation)
            this.solveTopCorners(cube, solution);
            
            // Step 6: Top Corners Permutation (PLL corners)
            this.solvePLLCorners(cube, solution);
            
            // Step 7: Top Edges Permutation (PLL edges)
            this.solvePLLEdges(cube, solution);
            
            // Step 8: Final Alignment
            this.finalAlignment(cube, solution);

            if (!this.isSolved(cube)) {
                throw new Error('Solve finished but cube is not solved. Parity error or impossible state.');
            }

        } catch (e) {
            console.error('Solver error:', e);
            throw e; 
        }
        
        return this.optimizeSolution(solution);
    }

    createCubeState(colors) {
        const state = {};
        for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
            state[face] = colors[face].map(c => c.toUpperCase());
        }
        return state;
    }

    // Move logic
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

    rotateAdjacentCW(cube, face) {
        let temp = [];
        switch (face) {
            case 'U':
                temp = [cube.F[0], cube.F[1], cube.F[2]];
                cube.F[0] = cube.R[0]; cube.F[1] = cube.R[1]; cube.F[2] = cube.R[2];
                cube.R[0] = cube.B[0]; cube.R[1] = cube.B[1]; cube.R[2] = cube.B[2];
                cube.B[0] = cube.L[0]; cube.B[1] = cube.L[1]; cube.B[2] = cube.L[2];
                cube.L[0] = temp[0]; cube.L[1] = temp[1]; cube.L[2] = temp[2];
                break;
            case 'D':
                temp = [cube.F[6], cube.F[7], cube.F[8]];
                cube.F[6] = cube.L[6]; cube.F[7] = cube.L[7]; cube.F[8] = cube.L[8];
                cube.L[6] = cube.B[6]; cube.L[7] = cube.B[7]; cube.L[8] = cube.B[8];
                cube.B[6] = cube.R[6]; cube.B[7] = cube.R[7]; cube.B[8] = cube.R[8];
                cube.R[6] = temp[0]; cube.R[7] = temp[1]; cube.R[8] = temp[2];
                break;
            case 'F':
                temp = [cube.U[6], cube.U[7], cube.U[8]];
                cube.U[6] = cube.L[8]; cube.U[7] = cube.L[5]; cube.U[8] = cube.L[2];
                cube.L[2] = cube.D[0]; cube.L[5] = cube.D[1]; cube.L[8] = cube.D[2];
                cube.D[0] = cube.R[6]; cube.D[1] = cube.R[3]; cube.D[2] = cube.R[0];
                cube.R[0] = temp[0]; cube.R[3] = temp[1]; cube.R[6] = temp[2];
                break;
            case 'B':
                temp = [cube.U[0], cube.U[1], cube.U[2]];
                cube.U[0] = cube.R[2]; cube.U[1] = cube.R[5]; cube.U[2] = cube.R[8];
                cube.R[2] = cube.D[8]; cube.R[5] = cube.D[7]; cube.R[8] = cube.D[6];
                cube.D[6] = cube.L[0]; cube.D[7] = cube.L[3]; cube.D[8] = cube.L[6];
                cube.L[0] = temp[2]; cube.L[3] = temp[1]; cube.L[6] = temp[0];
                break;
            case 'L':
                temp = [cube.U[0], cube.U[3], cube.U[6]];
                cube.U[0] = cube.B[8]; cube.U[3] = cube.B[5]; cube.U[6] = cube.B[2];
                cube.B[2] = cube.D[6]; cube.B[5] = cube.D[3]; cube.B[8] = cube.D[0];
                cube.D[0] = cube.F[0]; cube.D[3] = cube.F[3]; cube.D[6] = cube.F[6];
                cube.F[0] = temp[0]; cube.F[3] = temp[1]; cube.F[6] = temp[2];
                break;
            case 'R':
                temp = [cube.U[2], cube.U[5], cube.U[8]];
                cube.U[2] = cube.F[2]; cube.U[5] = cube.F[5]; cube.U[8] = cube.F[8];
                cube.F[2] = cube.D[2]; cube.F[5] = cube.D[5]; cube.F[8] = cube.D[8];
                cube.D[2] = cube.B[6]; cube.D[5] = cube.B[3]; cube.D[8] = cube.B[0];
                cube.B[0] = temp[2]; cube.B[3] = temp[1]; cube.B[6] = temp[0];
                break;
        }
    }

    rotateAdjacentCCW(cube, face) {
        let temp = [];
        switch (face) {
            case 'U':
                temp = [cube.F[0], cube.F[1], cube.F[2]];
                cube.F[0] = cube.L[0]; cube.F[1] = cube.L[1]; cube.F[2] = cube.L[2];
                cube.L[0] = cube.B[0]; cube.L[1] = cube.B[1]; cube.L[2] = cube.B[2];
                cube.B[0] = cube.R[0]; cube.B[1] = cube.R[1]; cube.B[2] = cube.R[2];
                cube.R[0] = temp[0]; cube.R[1] = temp[1]; cube.R[2] = temp[2];
                break;
            case 'D':
                temp = [cube.F[6], cube.F[7], cube.F[8]];
                cube.F[6] = cube.R[6]; cube.F[7] = cube.R[7]; cube.F[8] = cube.R[8];
                cube.R[6] = cube.B[6]; cube.R[7] = cube.B[7]; cube.R[8] = cube.B[8];
                cube.B[6] = cube.L[6]; cube.B[7] = cube.L[7]; cube.B[8] = cube.L[8];
                cube.L[6] = temp[0]; cube.L[7] = temp[1]; cube.L[8] = temp[2];
                break;
            case 'F':
                temp = [cube.U[6], cube.U[7], cube.U[8]];
                cube.U[6] = cube.R[0]; cube.U[7] = cube.R[3]; cube.U[8] = cube.R[6];
                cube.R[0] = cube.D[2]; cube.R[3] = cube.D[1]; cube.R[6] = cube.D[0];
                cube.D[0] = cube.L[2]; cube.D[1] = cube.L[5]; cube.D[2] = cube.L[8];
                cube.L[2] = temp[2]; cube.L[5] = temp[1]; cube.L[8] = temp[0];
                break;
            case 'B':
                temp = [cube.U[0], cube.U[1], cube.U[2]];
                cube.U[0] = cube.L[6]; cube.U[1] = cube.L[3]; cube.U[2] = cube.L[0];
                cube.L[0] = cube.D[6]; cube.L[3] = cube.D[7]; cube.L[6] = cube.D[8];
                cube.D[6] = cube.R[8]; cube.D[7] = cube.R[5]; cube.D[8] = cube.R[2];
                cube.R[2] = temp[0]; cube.R[5] = temp[1]; cube.R[8] = temp[2];
                break;
            case 'L':
                temp = [cube.U[0], cube.U[3], cube.U[6]];
                cube.U[0] = cube.F[0]; cube.U[3] = cube.F[3]; cube.U[6] = cube.F[6];
                cube.F[0] = cube.D[0]; cube.F[3] = cube.D[3]; cube.F[6] = cube.D[6];
                cube.D[0] = cube.B[8]; cube.D[3] = cube.B[5]; cube.D[6] = cube.B[2];
                cube.B[2] = temp[2]; cube.B[5] = temp[1]; cube.B[8] = temp[0];
                break;
            case 'R':
                temp = [cube.U[2], cube.U[5], cube.U[8]];
                cube.U[2] = cube.B[6]; cube.U[5] = cube.B[3]; cube.U[8] = cube.B[0];
                cube.B[0] = cube.D[8]; cube.B[3] = cube.D[5]; cube.B[6] = cube.D[2];
                cube.D[2] = cube.F[2]; cube.D[5] = cube.F[5]; cube.D[8] = cube.F[8];
                cube.F[2] = temp[0]; cube.F[5] = temp[1]; cube.F[8] = temp[2];
                break;
        }
    }

    applyMove(cube, move) {
        if (!move) return;
        const face = move[0];
        const prime = move.includes("'");
        const double = move.includes("2");
        const times = double ? 2 : 1;
        
        for (let i = 0; i < times; i++) {
            if (prime) {
                this.rotateFaceCCW(cube[face]);
                this.rotateAdjacentCCW(cube, face);
            } else {
                this.rotateFaceCW(cube[face]);
                this.rotateAdjacentCW(cube, face);
            }
        }
    }

    applySequence(cube, solution, moves) {
        for (const m of moves) {
            this.applyMove(cube, m);
            solution.push(m);
            if (solution.length > this.MAX_TOTAL_MOVES) throw new Error("Move limit exceeded");
        }
    }

    // --- Searching Utils ---

    findEdge(cube, c1, c2) {
        const edges = [
            { f1: 'U', i1: 1, f2: 'B', i2: 1 }, { f1: 'U', i1: 3, f2: 'L', i2: 1 },
            { f1: 'U', i1: 5, f2: 'R', i2: 1 }, { f1: 'U', i1: 7, f2: 'F', i2: 1 },
            { f1: 'D', i1: 1, f2: 'F', i2: 7 }, { f1: 'D', i1: 3, f2: 'L', i2: 7 },
            { f1: 'D', i1: 5, f2: 'R', i2: 7 }, { f1: 'D', i1: 7, f2: 'B', i2: 7 },
            { f1: 'F', i1: 3, f2: 'L', i2: 5 }, { f1: 'F', i1: 5, f2: 'R', i2: 3 },
            { f1: 'B', i1: 3, f2: 'R', i2: 5 }, { f1: 'B', i1: 5, f2: 'L', i2: 3 }
        ];
        for (const e of edges) {
            const colors = [cube[e.f1][e.i1], cube[e.f2][e.i2]];
            if (colors.includes(c1) && colors.includes(c2)) return e;
        }
        return null;
    }

    findCorner(cube, c1, c2, c3) {
        const corners = [
            { f1: 'U', i1: 0, f2: 'B', i2: 2, f3: 'L', i3: 0 },
            { f1: 'U', i1: 2, f2: 'R', i2: 2, f3: 'B', i3: 0 },
            { f1: 'U', i1: 6, f2: 'L', i2: 2, f3: 'F', i3: 0 },
            { f1: 'U', i1: 8, f2: 'F', i2: 2, f3: 'R', i3: 0 },
            { f1: 'D', i1: 0, f2: 'F', i2: 6, f3: 'L', i3: 8 },
            { f1: 'D', i1: 2, f2: 'R', i2: 6, f3: 'F', i3: 8 },
            { f1: 'D', i1: 6, f2: 'L', i2: 6, f3: 'B', i3: 8 },
            { f1: 'D', i1: 8, f2: 'B', i2: 6, f3: 'R', i3: 8 }
        ];
        const target = [c1, c2, c3].sort();
        for (const c of corners) {
            const current = [cube[c.f1][c.i1], cube[c.f2][c.i2], cube[c.f3][c.i3]].sort();
            if (JSON.stringify(current) === JSON.stringify(target)) return c;
        }
        return null;
    }

    // --- SOLVE STEPS ---

    solveBottomCross(cube, solution) {
        const bottomColor = cube.D[4];
        const sides = ['F', 'R', 'B', 'L'];
        
        for (const face of sides) {
            const sideColor = cube[face][4];
            let attempts = 0;
            
            while (cube.D[this.getEdgeDIndex(face)] !== bottomColor || cube[face][7] !== sideColor) {
                if (attempts++ > this.MAX_STEP_MOVES) throw new Error(`Cross failed for ${face}`);
                
                const edge = this.findEdge(cube, bottomColor, sideColor);
                
                // If on D layer but wrong
                if (edge.f1 === 'D' || edge.f2 === 'D') {
                    const f = (edge.f1 === 'D') ? this.getFaceAtDIndex(edge.i1) : edge.f1;
                    this.applySequence(cube, solution, [f, f]);
                    continue;
                }
                
                // If on U layer, rotate U until it's above the target face
                if (edge.f1 === 'U' || edge.f2 === 'U') {
                    const currentUFace = (edge.f1 === 'U') ? this.getFaceAtUIndex(edge.i1) : edge.f1;
                    if (currentUFace !== face) {
                        this.applySequence(cube, solution, ['U']);
                        continue;
                    }
                    // Above target face. Orient.
                    if (cube.U[this.getEdgeUIndex(face)] === bottomColor) {
                        this.applySequence(cube, solution, [face, face]);
                    } else {
                        // Fliped on U: U R' F R
                        this.applySequence(cube, solution, ["U", "R'", "F", "R"]);
                    }
                    continue;
                }
                
                // If in middle layer, move to U
                const f = edge.f1;
                if (edge.i1 === 5) this.applySequence(cube, solution, [f, "U", f + "'"]);
                else this.applySequence(cube, solution, [f + "'", "U", f]);
            }
        }
    }

    solveBottomCorners(cube, solution) {
        const bottomColor = cube.D[4];
        const sides = ['F', 'R', 'B', 'L'];
        
        for (let i = 0; i < 4; i++) {
            const f1 = sides[i];
            const f2 = sides[(i + 1) % 4];
            const c1 = cube[f1][4];
            const c2 = cube[f2][4];
            
            let attempts = 0;
            while (cube.D[this.getCornerDIdx(f1, f2)] !== bottomColor || cube[f1][6] !== c1 || cube[f2][8] !== c2) {
                if (attempts++ > this.MAX_STEP_MOVES) throw new Error(`Corner failed for ${f1}/${f2}`);
                
                const corner = this.findCorner(cube, bottomColor, c1, c2);
                
                // If on D, move to U
                if (corner.f1 === 'D' || corner.f2 === 'D' || corner.f3 === 'D') {
                    const dIdx = (corner.f1 === 'D') ? corner.i1 : (corner.f2 === 'D' ? corner.i2 : corner.i3);
                    const pair = this.getSideFacesForDCorner(dIdx);
                    this.applySequence(cube, solution, [pair[1], "U", pair[1] + "'"]);
                    continue;
                }
                
                // Match U position
                const uPos = this.getUCornerPos(corner);
                if (uPos !== f1) {
                    this.applySequence(cube, solution, ['U']);
                    continue;
                }
                
                // Insert: R U R' U'
                this.applySequence(cube, solution, [f2, "U", f2 + "'", "U'"]);
            }
        }
    }

    solveMiddleLayer(cube, solution) {
        const sides = ['F', 'R', 'B', 'L'];
        const topColor = cube.U[4];
        
        for (let i = 0; i < 4; i++) {
            const f1 = sides[i];
            const f2 = sides[(i + 1) % 4];
            const c1 = cube[f1][4];
            const c2 = cube[f2][4];
            
            let attempts = 0;
            while (cube[f1][5] !== c1 || cube[f2][3] !== c2) {
                if (attempts++ > this.MAX_STEP_MOVES) throw new Error(`Middle edge failed for ${f1}/${f2}`);
                
                const edge = this.findEdge(cube, c1, c2);
                
                // If in middle but wrong
                if (edge.f1 !== 'U' && edge.f2 !== 'U') {
                    const F = edge.f1;
                    const R = edge.f2;
                    this.applySequence(cube, solution, ["U", R, "U'", R + "'", "U'", F + "'", "U", F]);
                    continue;
                }
                
                // On U. Match color.
                const sideFace = (edge.f1 === 'U') ? edge.f2 : edge.f1;
                const sideColor = cube[sideFace][1];
                
                if (sideColor !== cube[sideFace][4]) {
                    this.applySequence(cube, solution, ['U']);
                    continue;
                }
                
                // Match. Insert.
                const topVal = (edge.f1 === 'U') ? cube.U[edge.i1] : cube[edge.f1][edge.i1];
                if (topVal === cube[this.getRightFace(sideFace)][4]) {
                    const F = sideFace; const R = this.getRightFace(sideFace);
                    this.applySequence(cube, solution, ["U", R, "U'", R + "'", "U'", F + "'", "U", F]);
                } else {
                    const F = sideFace; const L = this.getLeftFace(sideFace);
                    this.applySequence(cube, solution, ["U'", L + "'", "U", L, "U", F, "U'", F + "'"]);
                }
            }
        }
    }

    solveTopCross(cube, solution) {
        const top = cube.U[4];
        let attempts = 0;
        while (!this.isTopCross(cube, top)) {
            if (attempts++ > 10) throw new Error("Top cross failed");
            const shape = this.getTopCrossShape(cube, top);
            if (shape === 'L') {
                while (!(cube.U[1] === top && cube.U[3] === top)) this.applySequence(cube, solution, ['U']);
            } else if (shape === 'line') {
                while (!(cube.U[3] === top && cube.U[5] === top)) this.applySequence(cube, solution, ['U']);
            }
            this.applySequence(cube, solution, ["F", "R", "U", "R'", "U'", "F'"]);
        }
    }

    isTopCross(cube, top) {
        return cube.U[1] === top && cube.U[3] === top && cube.U[5] === top && cube.U[7] === top;
    }

    getTopCrossShape(cube, top) {
        const count = [cube.U[1], cube.U[3], cube.U[5], cube.U[7]].filter(c => c === top).length;
        if (count === 0) return 'dot';
        if (count === 4) return 'cross';
        if ((cube.U[1] === top && cube.U[7] === top) || (cube.U[3] === top && cube.U[5] === top)) return 'line';
        return 'L';
    }

    solveTopCorners(cube, solution) {
        const top = cube.U[4];
        let attempts = 0;
        while (this.countTopCorners(cube, top) < 4) {
            if (attempts++ > 20) throw new Error("Top corners orientation failed");
            const count = this.countTopCorners(cube, top);
            if (count === 1) {
                while (cube.U[6] !== top) this.applySequence(cube, solution, ['U']);
            } else if (count === 0) {
                while (cube.L[2] !== top) this.applySequence(cube, solution, ['U']);
            }
            this.applySequence(cube, solution, ["R", "U", "R'", "U", "R", "U2", "R'"]);
        }
    }

    countTopCorners(cube, top) {
        return [cube.U[0], cube.U[2], cube.U[6], cube.U[8]].filter(c => c === top).length;
    }

    solvePLLCorners(cube, solution) {
        let attempts = 0;
        while (!this.arePLLCornersSolved(cube)) {
            if (attempts++ > 20) throw new Error("PLL corners failed");
            const headlights = this.findHeadlights(cube);
            if (headlights) {
                while (this.findHeadlights(cube) !== 'B') this.applySequence(cube, solution, ['U']);
                // R' F R' B2 R F' R' B2 R2
                this.applySequence(cube, solution, ["R'", "F", "R'", "B2", "R", "F'", "R'", "B2", "R2"]);
            } else {
                this.applySequence(cube, solution, ["R'", "F", "R'", "B2", "R", "F'", "R'", "B2", "R2"]);
            }
        }
    }

    arePLLCornersSolved(cube) {
        const sides = ['F', 'R', 'B', 'L'];
        for (const f of sides) if (cube[f][0] !== cube[f][2]) return false;
        return true;
    }

    findHeadlights(cube) {
        for (const f of ['F', 'R', 'B', 'L']) if (cube[f][0] === cube[f][2]) return f;
        return null;
    }

    solvePLLEdges(cube, solution) {
        let attempts = 0;
        while (!this.isSolved(cube)) {
            if (attempts++ > 20) break;
            const solved = this.getSolvedPLLSide(cube);
            if (solved) {
                while (this.getSolvedPLLSide(cube) !== 'B') this.applySequence(cube, solution, ['U']);
                // F2 U L R' F2 L' R U F2
                this.applySequence(cube, solution, ["F2", "U", "L", "R'", "F2", "L'", "R", "U", "F2"]);
            } else {
                this.applySequence(cube, solution, ["F2", "U", "L", "R'", "F2", "L'", "R", "U", "F2"]);
            }
        }
    }

    getSolvedPLLSide(cube) {
        for (const f of ['F', 'R', 'B', 'L']) {
            if (cube[f][0] === cube[f][1] && cube[f][1] === cube[f][2]) return f;
        }
        return null;
    }

    finalAlignment(cube, solution) {
        for (let i = 0; i < 4; i++) {
            if (this.isSolved(cube)) return;
            this.applySequence(cube, solution, ['U']);
        }
    }

    isSolved(cube) {
        for (const f of ['U', 'D', 'F', 'B', 'L', 'R']) {
            const c = cube[f][4];
            for (let i = 0; i < 9; i++) if (cube[f][i] !== c) return false;
        }
        return true;
    }

    // --- Index Helpers ---

    getEdgeDIndex(face) {
        if (face === 'F') return 1; if (face === 'R') return 5;
        if (face === 'B') return 7; if (face === 'L') return 3;
    }
    getFaceAtDIndex(idx) {
        if (idx === 1) return 'F'; if (idx === 5) return 'R';
        if (idx === 7) return 'B'; if (idx === 3) return 'L';
    }
    getEdgeUIndex(face) {
        if (face === 'F') return 7; if (face === 'R') return 5;
        if (face === 'B') return 1; if (face === 'L') return 3;
    }
    getFaceAtUIndex(idx) {
        if (idx === 7) return 'F'; if (idx === 5) return 'R';
        if (idx === 1) return 'B'; if (idx === 3) return 'L';
    }
    getCornerDIdx(f1, f2) {
        if (f1 === 'F' && f2 === 'R') return 2; if (f1 === 'R' && f2 === 'B') return 8;
        if (f1 === 'B' && f2 === 'L') return 6; if (f1 === 'L' && f2 === 'F') return 0;
    }
    getSideFacesForDCorner(idx) {
        if (idx === 2) return ['F', 'R']; if (idx === 8) return ['R', 'B'];
        if (idx === 6) return ['B', 'L']; if (idx === 0) return ['L', 'F'];
    }
    getUCornerPos(corner) {
        const uIdx = (corner.f1 === 'U') ? corner.i1 : (corner.f2 === 'U' ? corner.i2 : corner.i3);
        if (uIdx === 6) return 'F'; // Above FL (wait, F Left is 6)
        if (idx === 8) return 'F'; // wait, index 8 is next to R.
        // Simplified mapping for U corners: 
        if (uIdx === 6) return 'B'; if (uIdx === 0) return 'R'; // Just iterate D
        return 'F'; // placeholder
    }
    // Better mapping
    getUCornerPos(corner) {
        const uIdx = (corner.f1 === 'U') ? corner.i1 : (corner.f2 === 'U' ? corner.i2 : corner.i3);
        if (uIdx === 6) return 'L'; if (uIdx === 8) return 'F';
        if (uIdx === 2) return 'R'; if (uIdx === 0) return 'B';
    }

    getRightFace(f) {
        const s = ['F', 'R', 'B', 'L']; return s[(s.indexOf(f) + 1) % 4];
    }
    getLeftFace(f) {
        const s = ['F', 'R', 'B', 'L']; return s[(s.indexOf(f) + 3) % 4];
    }

    optimizeSolution(solution) {
        if (solution.length === 0) return [];
        const opt = [];
        for (const m of solution) {
            if (opt.length > 0 && opt[opt.length - 1][0] === m[0]) {
                const last = opt.pop();
                const c1 = last.includes('2') ? 2 : (last.includes("'") ? 3 : 1);
                const c2 = m.includes('2') ? 2 : (m.includes("'") ? 3 : 1);
                const total = (c1 + c2) % 4;
                if (total === 1) opt.push(last[0]);
                else if (total === 2) opt.push(last[0] + '2');
                else if (total === 3) opt.push(last[0] + "'");
            } else opt.push(m);
        }
        return (opt.length < solution.length) ? this.optimizeSolution(opt) : opt;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CubeSolver };
}
