const LISTENING_BAND_RULES = [
    { min: 39, band: 9.0 },
    { min: 37, band: 8.5 },
    { min: 35, band: 8.0 },
    { min: 32, band: 7.5 },
    { min: 30, band: 7.0 },
    { min: 26, band: 6.5 },
    { min: 23, band: 6.0 },
    { min: 18, band: 5.5 },
    { min: 16, band: 5.0 },
    { min: 13, band: 4.5 },
    { min: 10, band: 4.0 },
    { min: 8, band: 3.5 },
    { min: 6, band: 3.0 },
    { min: 4, band: 2.5 },
    { min: 2, band: 2.0 },
    { min: 1, band: 1.0 },
    { min: 0, band: 0.0 },
];

const READING_BAND_RULES = [
    { min: 39, band: 9.0 },
    { min: 37, band: 8.5 },
    { min: 35, band: 8.0 },
    { min: 33, band: 7.5 },
    { min: 30, band: 7.0 },
    { min: 27, band: 6.5 },
    { min: 23, band: 6.0 },
    { min: 19, band: 5.5 },
    { min: 15, band: 5.0 },
    { min: 13, band: 4.5 },
    { min: 10, band: 4.0 },
    { min: 8, band: 3.5 },
    { min: 6, band: 3.0 },
    { min: 4, band: 2.5 },
    { min: 2, band: 2.0 },
    { min: 1, band: 1.0 },
    { min: 0, band: 0.0 },
];

const clampBand = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.max(0, Math.min(9, numeric));
};

export const roundToNearestHalfBand = (value) => {
    const clamped = clampBand(value);
    if (clamped === null) return null;
    return Math.round(clamped * 2) / 2;
};

const scoreToBandByRules = (rawScore, rules) => {
    const numeric = Number(rawScore);
    if (!Number.isFinite(numeric)) return null;

    const safeRaw = Math.max(0, Math.min(40, Math.floor(numeric)));
    const matched = rules.find((rule) => safeRaw >= rule.min);
    return matched ? matched.band : null;
};

export const calculateExamBand = ({ skillType, totalCorrect }) => {
    const skill = String(skillType || '').toUpperCase();
    if (skill === 'LISTENING') {
        return scoreToBandByRules(totalCorrect, LISTENING_BAND_RULES);
    }
    if (skill === 'READING') {
        return scoreToBandByRules(totalCorrect, READING_BAND_RULES);
    }
    return null;
};

const parseCriterionBand = (value) => {
    const raw = String(value ?? '').trim();
    if (raw === '') return null;

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    if (numeric < 0 || numeric > 9) return null;
    return numeric;
};

export const calculateWritingBandFromCriteria = ({
    taskAchievement,
    coherenceCohesion,
    lexicalResource,
    grammaticalRange,
}) => {
    const values = [
        parseCriterionBand(taskAchievement),
        parseCriterionBand(coherenceCohesion),
        parseCriterionBand(lexicalResource),
        parseCriterionBand(grammaticalRange),
    ];

    if (values.some((v) => v === null)) return null;

    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    return roundToNearestHalfBand(average);
};

export const formatBand = (value) => {
    const numeric = clampBand(value);
    if (numeric === null) return 'N/A';
    return numeric.toFixed(1);
};
