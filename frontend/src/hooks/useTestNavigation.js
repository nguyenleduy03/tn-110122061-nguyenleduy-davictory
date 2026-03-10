import { useState, useEffect } from 'react';

export function useTestNavigation(testData) {
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [activeQuestion, setActiveQuestion] = useState(null);

    const part = testData?.parts[currentPartIndex];

    // Auto-focus first question and scroll to top when part changes
    useEffect(() => {
        if (part?.questions?.length) {
            const firstQ = part.questions[0];
            const firstNum = firstQ.subQuestions ? firstQ.subQuestions[0].number : firstQ.number;
            setActiveQuestion(firstNum);
        }
        document.querySelector('.passage-section')?.scrollTo(0, 0);
        document.querySelector('.questions-section')?.scrollTo(0, 0);
        document.querySelector('.ielts-main')?.scrollTo(0, 0);
    }, [currentPartIndex, part]);

    const goNext = () => {
        if (!part || !testData) return;
        const questions = part.questions.map(q => q.number);
        const currIdx = questions.indexOf(activeQuestion);
        if (currIdx > -1 && currIdx < questions.length - 1) {
            setActiveQuestion(questions[currIdx + 1]);
        } else if (currIdx === questions.length - 1 && currentPartIndex < testData.parts.length - 1) {
            setCurrentPartIndex(currentPartIndex + 1);
            setActiveQuestion(testData.parts[currentPartIndex + 1].questions[0].number);
        }
    };

    const goPrev = () => {
        if (!part || !testData) return;
        const questions = part.questions.map(q => q.number);
        const currIdx = questions.indexOf(activeQuestion);
        if (currIdx > 0) {
            setActiveQuestion(questions[currIdx - 1]);
        } else if (currIdx === 0 && currentPartIndex > 0) {
            setCurrentPartIndex(currentPartIndex - 1);
            const prevPart = testData.parts[currentPartIndex - 1];
            setActiveQuestion(prevPart.questions[prevPart.questions.length - 1].number);
        }
    };

    const isFirstQuestion =
        testData &&
        currentPartIndex === 0 &&
        activeQuestion === part?.questions?.[0]?.number;

    const isLastQuestion =
        testData &&
        currentPartIndex === testData.parts.length - 1 &&
        activeQuestion === part?.questions?.[part.questions.length - 1]?.number;

    return {
        currentPartIndex,
        setCurrentPartIndex,
        activeQuestion,
        setActiveQuestion,
        part,
        goNext,
        goPrev,
        isFirstQuestion,
        isLastQuestion,
    };
}
