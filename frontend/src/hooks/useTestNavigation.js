import { useState, useEffect } from 'react';

export function useTestNavigation(testData) {
    const [currentPartIndex, setCurrentPartIndex] = useState(0);
    const [activeQuestion, setActiveQuestion] = useState(null);

    const part = testData?.parts[currentPartIndex];

    const getQuestionNumbers = () => {
        const nums = [];
        if (!part?.questions) return nums;
        for (const q of part.questions) {
            if (q?.numberRange?.length) {
                nums.push(...q.numberRange);
            } else if (q?.subQuestions?.length) {
                nums.push(...q.subQuestions.map((sq) => sq.number).filter((n) => n != null));
            } else if (q?.number != null) {
                nums.push(q.number);
            }
        }
        return nums;
    };

    // Auto-focus first question and scroll to top when part changes
    useEffect(() => {
        const nums = getQuestionNumbers();
        if (nums.length > 0) setActiveQuestion(nums[0]);
        document.querySelector('.passage-section')?.scrollTo(0, 0);
        document.querySelector('.questions-section')?.scrollTo(0, 0);
        document.querySelector('.ielts-main')?.scrollTo(0, 0);
    }, [currentPartIndex, part]);

    const findActiveQuestionElement = (questionNumber) => {
        const byId = document.getElementById(`question-${questionNumber}`);
        if (byId) return byId;

        return document.querySelector(`[data-question-numbers~="${questionNumber}"]`);
    };

    const scrollElementIntoQuestionsSection = (el) => {
        if (!el) return false;
        const questionsSection = el.closest('.questions-section') || document.querySelector('.questions-section');

        if (!questionsSection) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            return true;
        }

        const containerRect = questionsSection.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const targetTop = questionsSection.scrollTop
            + (elRect.top - containerRect.top)
            - (questionsSection.clientHeight / 2)
            + (elRect.height / 2);

        questionsSection.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
        return true;
    };

    // Keep viewport in sync with current question when navigating via Next/Prev.
    useEffect(() => {
        if (activeQuestion == null) return;

        let isCancelled = false;
        let attempts = 0;
        let retryTimerId = null;

        const scrollToActiveQuestion = () => {
            if (isCancelled) return;

            const el = findActiveQuestionElement(activeQuestion);
            if (el && scrollElementIntoQuestionsSection(el)) {
                return;
            }

            if (attempts < 20) {
                attempts += 1;
                retryTimerId = window.setTimeout(scrollToActiveQuestion, 50);
            }
        };

        const startTimer = window.setTimeout(scrollToActiveQuestion, 0);
        return () => {
            isCancelled = true;
            window.clearTimeout(startTimer);
            if (retryTimerId) window.clearTimeout(retryTimerId);
        };
    }, [activeQuestion, currentPartIndex]);

    const goNext = () => {
        if (!part || !testData) return;
        const questions = getQuestionNumbers();
        const currIdx = questions.indexOf(activeQuestion);
        if (currIdx > -1 && currIdx < questions.length - 1) {
            setActiveQuestion(questions[currIdx + 1]);
        } else if (currIdx === questions.length - 1 && currentPartIndex < testData.parts.length - 1) {
            setCurrentPartIndex(currentPartIndex + 1);
            const nextPart = testData.parts[currentPartIndex + 1];
            const nextNums = nextPart?.questions
                ? nextPart.questions.flatMap((q) => q.numberRange?.length
                    ? q.numberRange
                    : (q.subQuestions?.length
                        ? q.subQuestions.map((sq) => sq.number)
                        : (q.number != null ? [q.number] : [])))
                : [];
            setActiveQuestion(nextNums[0] ?? null);
        }
    };

    const goPrev = () => {
        if (!part || !testData) return;
        const questions = getQuestionNumbers();
        const currIdx = questions.indexOf(activeQuestion);
        if (currIdx > 0) {
            setActiveQuestion(questions[currIdx - 1]);
        } else if (currIdx === 0 && currentPartIndex > 0) {
            setCurrentPartIndex(currentPartIndex - 1);
            const prevPart = testData.parts[currentPartIndex - 1];
            const prevNums = prevPart?.questions
                ? prevPart.questions.flatMap((q) => q.numberRange?.length
                    ? q.numberRange
                    : (q.subQuestions?.length
                        ? q.subQuestions.map((sq) => sq.number)
                        : (q.number != null ? [q.number] : [])))
                : [];
            setActiveQuestion(prevNums.length ? prevNums[prevNums.length - 1] : null);
        }
    };

    const isFirstQuestion =
        testData &&
        currentPartIndex === 0 &&
        activeQuestion === getQuestionNumbers()[0];

    const isLastQuestion =
        testData &&
        currentPartIndex === testData.parts.length - 1 &&
        activeQuestion === getQuestionNumbers().slice(-1)[0];

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
