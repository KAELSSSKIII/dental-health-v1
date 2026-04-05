import { motion } from 'framer-motion';
import { TOOTH_STATUS_MAP } from '../../utils/constants';

// Classify each tooth number into a shape type
const getToothType = (num) => {
    if ([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(num)) return 'molar';
    if ([4, 5, 12, 13, 20, 21, 28, 29].includes(num)) return 'premolar';
    if ([6, 11, 22, 27].includes(num)) return 'canine';
    return 'incisor'; // 7,8,9,10 and 23,24,25,26
};

// All shapes: crown at top, cusps pointing DOWN.
// Lower teeth rendered with scaleY(-1) so cusps face UP toward the jaw line.
const SHAPES = {
    incisor: {
        w: 16, h: 30,
        d: 'M2,0 L14,0 Q16,2 16,5 L16,25 Q14,30 8,30 Q2,30 0,25 L0,5 Q0,2 2,0 Z',
    },
    canine: {
        w: 16, h: 33,
        d: 'M2,0 L14,0 Q16,2 16,5 L16,19 Q12,33 8,33 Q4,33 0,19 L0,5 Q0,2 2,0 Z',
    },
    premolar: {
        w: 20, h: 30,
        d: 'M2,0 L18,0 Q20,2 20,5 L20,20 Q18,24 14,24 Q13,30 11,30 L9,30 Q7,30 6,24 Q2,24 0,20 L0,5 Q0,2 2,0 Z',
    },
    molar: {
        w: 26, h: 28,
        d: 'M2,0 L24,0 Q26,2 26,5 L26,18 Q24,23 19,23 Q18,28 15,28 L11,28 Q8,28 7,23 Q2,23 0,18 L0,5 Q0,2 2,0 Z',
    },
};

export default function ToothButton({ number, status, isUpper, hasChange, style, onClick }) {
    const cfg         = TOOTH_STATUS_MAP[status] || TOOTH_STATUS_MAP.healthy;
    const isMissing   = status === 'missing';
    const isExtracted = status === 'extracted';
    const type        = getToothType(number);
    const shape       = SHAPES[type];

    // Flip lower teeth so cusps point upward toward the jaw line
    const svgTransform = isUpper ? '' : `scale(1,-1) translate(0,-${shape.h})`;

    const fill        = isMissing || isExtracted ? 'none' : cfg.color;
    const strokeStyle = isMissing ? '4,3' : undefined;

    const numClass = `text-[9px] font-bold leading-none select-none ${
        hasChange ? 'text-amber-500' : 'text-text-secondary/60'
    }`;

    return (
        <motion.button
            type="button"
            whileHover={{ scale: 1.14, y: isUpper ? -3 : 3 }}
            whileTap={{ scale: 0.93 }}
            className="relative flex flex-col items-center gap-[3px] cursor-pointer focus:outline-none"
            style={style}
            onClick={onClick}
            title={`Tooth #${number} — ${cfg.label}`}
        >
            {/* Number above shape for lower teeth (closest to jaw line) */}
            {!isUpper && <span className={numClass}>{number}</span>}

            <div className="relative">
                <svg
                    width={shape.w}
                    height={shape.h}
                    viewBox={`0 0 ${shape.w} ${shape.h}`}
                    style={{ display: 'block', overflow: 'visible' }}
                >
                    <g transform={svgTransform}>
                        <path
                            d={shape.d}
                            fill={fill}
                            stroke={cfg.color}
                            strokeWidth={isMissing ? 1.2 : 1.5}
                            strokeDasharray={strokeStyle}
                        />

                        {/* X mark for extracted teeth */}
                        {isExtracted && (
                            <>
                                <line
                                    x1={shape.w * 0.2} y1={shape.h * 0.15}
                                    x2={shape.w * 0.8} y2={shape.h * 0.85}
                                    stroke={cfg.color} strokeWidth="2" strokeLinecap="round"
                                />
                                <line
                                    x1={shape.w * 0.8} y1={shape.h * 0.15}
                                    x2={shape.w * 0.2} y2={shape.h * 0.85}
                                    stroke={cfg.color} strokeWidth="2" strokeLinecap="round"
                                />
                            </>
                        )}
                    </g>
                </svg>

                {/* Unsaved change indicator */}
                {hasChange && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white z-10" />
                )}
            </div>

            {/* Number below shape for upper teeth (closest to jaw line) */}
            {isUpper && <span className={numClass}>{number}</span>}
        </motion.button>
    );
}
