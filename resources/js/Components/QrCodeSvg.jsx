import { useMemo } from 'react';

/**
 * Real ISO/IEC 18004 QR Code Matrix Generator (Byte Mode, Error Correction Level L).
 * Supports Version 2 (25x25, up to 32 bytes) and Version 3 (29x29, up to 53 bytes).
 */
function createQrMatrix(text = 'ABSENSI') {
    const utf8Bytes = Array.from(new TextEncoder().encode(text));
    const version = utf8Bytes.length <= 32 ? 2 : 3;
    const size = version === 2 ? 25 : 29;
    const dataCapacity = version === 2 ? 34 : 55;
    const ecLength = 10; // Wait: Version 2-L has 10 EC codewords; Version 3-L has 15 EC codewords
    const numEc = version === 2 ? 10 : 15;

    // 1. Build bit stream: Byte mode (0100) + 8-bit length + bytes + terminator
    const bits = [];
    const pushBits = (val, len) => {
        for (let i = len - 1; i >= 0; i -= 1) {
            bits.push((val >>> i) & 1);
        }
    };

    const payload = utf8Bytes.slice(0, version === 2 ? 32 : 53);
    pushBits(0b0100, 4);
    pushBits(payload.length, 8);
    payload.forEach((b) => pushBits(b, 8));

    const maxDataBits = dataCapacity * 8;
    const terminatorLen = Math.min(4, maxDataBits - bits.length);
    pushBits(0, terminatorLen);

    while (bits.length % 8 !== 0) {
        bits.push(0);
    }

    const dataCodewords = [];
    for (let i = 0; i < bits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8; j += 1) {
            byte = (byte << 1) | bits[i + j];
        }
        dataCodewords.push(byte);
    }

    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (dataCodewords.length < dataCapacity) {
        dataCodewords.push(padBytes[padIdx % 2]);
        padIdx += 1;
    }

    // 2. Reed-Solomon GF(256) Error Correction
    const gfExp = new Uint8Array(512);
    const gfLog = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
        gfExp[i] = x;
        gfLog[x] = i;
        x <<= 1;
        if (x & 0x100) {
            x ^= 0x11d;
        }
    }
    for (let i = 255; i < 512; i += 1) {
        gfExp[i] = gfExp[i - 255];
    }

    const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : gfExp[gfLog[a] + gfLog[b]]);

    let poly = [1];
    for (let i = 0; i < numEc; i += 1) {
        const next = new Array(poly.length + 1).fill(0);
        const factor = gfExp[i];
        for (let j = 0; j < poly.length; j += 1) {
            next[j] ^= poly[j];
            next[j + 1] ^= gfMul(poly[j], factor);
        }
        poly = next;
    }

    const ecCodewords = new Array(numEc).fill(0);
    for (let i = 0; i < dataCodewords.length; i += 1) {
        const factor = dataCodewords[i] ^ ecCodewords[0];
        ecCodewords.shift();
        ecCodewords.push(0);
        for (let j = 0; j < numEc; j += 1) {
            ecCodewords[j] ^= gfMul(poly[j + 1], factor);
        }
    }

    const allCodewords = [...dataCodewords, ...ecCodewords];

    // 3. Initialize Matrix & Function Patterns
    const matrix = Array.from({ length: size }, () => Array(size).fill(false));
    const isFunction = Array.from({ length: size }, () =>
        Array(size).fill(false),
    );

    const setFunctionModule = (r, c, dark) => {
        if (r >= 0 && r < size && c >= 0 && c < size) {
            matrix[r][c] = Boolean(dark);
            isFunction[r][c] = true;
        }
    };

    const placeFinder = (rowOffset, colOffset) => {
        for (let r = -1; r <= 7; r += 1) {
            for (let c = -1; c <= 7; c += 1) {
                const isDark =
                    r >= 0 &&
                    r <= 6 &&
                    c >= 0 &&
                    c <= 6 &&
                    (r === 0 ||
                        r === 6 ||
                        c === 0 ||
                        c === 6 ||
                        (r >= 2 && r <= 4 && c >= 2 && c <= 4));
                setFunctionModule(rowOffset + r, colOffset + c, isDark);
            }
        }
    };

    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // Alignment pattern for Version 2/3 at (size - 7, size - 7)
    const alignCenter = size - 7;
    for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
            const isDark =
                Math.max(Math.abs(r), Math.abs(c)) === 2 || (r === 0 && c === 0);
            setFunctionModule(alignCenter + r, alignCenter + c, isDark);
        }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i += 1) {
        if (!isFunction[6][i]) {
            setFunctionModule(6, i, i % 2 === 0);
        }
        if (!isFunction[i][6]) {
            setFunctionModule(i, 6, i % 2 === 0);
        }
    }

    // Reserve format information areas & dark module
    for (let i = 0; i <= 8; i += 1) {
        if (i !== 6) {
            isFunction[8][i] = true;
            isFunction[i][8] = true;
        }
    }
    for (let i = 0; i < 8; i += 1) {
        isFunction[8][size - 1 - i] = true;
        isFunction[size - 1 - i][8] = true;
    }
    setFunctionModule(size - 8, 8, true);

    // 4. Place Data & EC Bits in Zigzag upward/downward columns
    const allBits = [];
    allCodewords.forEach((byte) => {
        for (let i = 7; i >= 0; i -= 1) {
            allBits.push((byte >>> i) & 1);
        }
    });

    let bitIdx = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) {
            right = 5;
        }
        for (let vert = 0; vert < size; vert += 1) {
            const r = upward ? size - 1 - vert : vert;
            for (let j = 0; j < 2; j += 1) {
                const c = right - j;
                if (!isFunction[r][c]) {
                    const dataBit =
                        bitIdx < allBits.length ? Boolean(allBits[bitIdx]) : false;
                    bitIdx += 1;
                    // Apply Mask 0: (r + c) % 2 === 0
                    const mask = (r + c) % 2 === 0;
                    matrix[r][c] = dataBit !== mask;
                }
            }
        }
        upward = !upward;
    }

    // 5. Write Format Information for Level L (01) and Mask 0 (000) => 0x77C4
    const formatBits = 0x77c4;
    const getFormatBit = (i) => ((formatBits >>> i) & 1) === 1;

    for (let i = 0; i <= 5; i += 1) {
        matrix[8][i] = getFormatBit(14 - i);
    }
    matrix[8][7] = getFormatBit(8);
    matrix[8][8] = getFormatBit(7);
    matrix[7][8] = getFormatBit(6);
    for (let i = 0; i <= 5; i += 1) {
        matrix[5 - i][8] = getFormatBit(5 - i);
    }

    for (let i = 0; i < 8; i += 1) {
        matrix[8][size - 1 - i] = getFormatBit(i);
    }
    for (let i = 0; i < 7; i += 1) {
        matrix[size - 7 + i][8] = getFormatBit(14 - i);
    }

    return matrix;
}

export default function QrCodeSvg({ value, className = 'h-48 w-48' }) {
    const matrix = useMemo(() => createQrMatrix(value || 'ABSENSI'), [value]);
    const size = matrix.length;
    const quietZone = 4;
    const totalSize = size + quietZone * 2;

    return (
        <svg
            viewBox={`0 0 ${totalSize} ${totalSize}`}
            className={className}
            shapeRendering="crispEdges"
            role="img"
            aria-label={`QR Code ${value}`}
        >
            <rect width={totalSize} height={totalSize} fill="#ffffff" rx="1.5" />
            {matrix.map((row, rIdx) =>
                row.map((cell, cIdx) =>
                    cell ? (
                        <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx + quietZone}
                            y={rIdx + quietZone}
                            width={1}
                            height={1}
                            fill="#0f172a"
                        />
                    ) : null,
                ),
            )}
        </svg>
    );
}
