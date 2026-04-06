import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, User } from 'lucide-react';
import LmsLayout from '../../components/lms/LmsLayout';
import { teacherApi } from '../../services/teacherApi';
import { ieltsApi } from '../../services/ieltsApi';
import { calculateExamBand, formatBand } from '../../utils/ieltsScoring';

const normalizeSkillToken = (value) => String(value || '').trim().toUpperCase();
const isWritingSkill = (value) => normalizeSkillToken(value).includes('WRITING');
const isSpeakingSkill = (value) => normalizeSkillToken(value).includes('SPEAKING');

export default function LmsSubmissionDetail() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceParam = String(searchParams.get('source') || '').toLowerCase();
  const [submission, setSubmission] = useState(null);
  const [resolvedType, setResolvedType] = useState(type);
  const [resolvedSource, setResolvedSource] = useState(sourceParam || '');
  const [totalSkillQuestions, setTotalSkillQuestions] = useState(0);
  const [examReviewSession, setExamReviewSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gradeHistory, setGradeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const isLikelyDrivePreviewUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return false;
    return /(\/api\/files\/preview\/|https?:\/\/.*\/api\/files\/preview\/)/i.test(raw);
  };

  const normalizeTextFromDriveFile = (content) => {
    const text = String(content || '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';

    // Writing upload stores metadata lines, then one blank line, then essay body.
    const splitMarker = '\n\n';
    const markerIndex = text.indexOf(splitMarker);
    if (markerIndex > -1) {
      const essayBody = text.slice(markerIndex + splitMarker.length).trim();
      if (essayBody) return essayBody;
    }

    return text;
  };

  const loadWritingTextFromDriveUrls = async (answers = []) => {
    const urls = [];
    const seen = new Set();

    answers.forEach((answer) => {
      [answer?.selectedOptionLabel, answer?.textAnswer]
        .map((value) => String(value || '').trim())
        .forEach((candidate) => {
          if (!isLikelyDrivePreviewUrl(candidate) || seen.has(candidate)) return;
          seen.add(candidate);
          urls.push(candidate);
        });
    });

    if (!urls.length) return '';

    const chunks = [];
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const text = normalizeTextFromDriveFile(await response.text());
        if (text) chunks.push(text);
      } catch {
        // Ignore unreadable files and fallback to stored DB text.
      }
    }

    return chunks.join('\n\n').trim();
  };

  const buildWritingLikeFromExamAttempt = async (attempt) => {
    const answers = Array.isArray(attempt?.answers) ? attempt.answers : [];
    const fallbackSubmissionText = answers
      .map((a) => String(a?.textAnswer || '').trim())
      .filter((text) => text && !isLikelyDrivePreviewUrl(text))
      .join('\n\n')
      .trim();

    const driveSubmissionText = await loadWritingTextFromDriveUrls(answers);
    const submissionText = driveSubmissionText || fallbackSubmissionText;

    const derivedWordCount = submissionText
      ? submissionText.split(/\s+/).filter(Boolean).length
      : 0;

    return {
      id: attempt?.id,
      username: attempt?.username,
      submittedAt: attempt?.submittedAt || attempt?.startedAt,
      startedAt: attempt?.startedAt,
      timeSpentSeconds: attempt?.timeSpentSeconds ?? null,
      status: attempt?.status,
      groupTitle: attempt?.testTitle || 'Writing Submission',
      submissionText,
      wordCount: attempt?.wordCount ?? derivedWordCount,
      sourceExamAttemptId: attempt?.id,
    };
  };

  const countTotalQuestionsFromSession = (session) => {
    if (!session?.parts?.length) return 0;

    const totalByPartMeta = session.parts.reduce((sum, part) => {
      const value = Number(part?.totalQuestions || 0);
      return sum + (Number.isFinite(value) && value > 0 ? value : 0);
    }, 0);
    if (totalByPartMeta > 0) return totalByPartMeta;

    return session.parts.reduce((partSum, part) => {
      const questions = part.questions || [];
      return partSum + questions.reduce((qSum, q) => {
        if (Array.isArray(q.numberRange) && q.numberRange.length > 0) return qSum + q.numberRange.length;
        if (Array.isArray(q.subQuestions) && q.subQuestions.length > 0) return qSum + q.subQuestions.length;
        return qSum + 1;
      }, 0);
    }, 0);
  };

  const formatDuration = (seconds) => {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) return '—';

    const total = Math.floor(value);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getSubmissionDuration = (item) => (
    item?.timeSpentSeconds ?? item?.timeTakenSeconds ?? null
  );

  const firstNonBlankText = (...values) => {
    for (const value of values) {
      const normalized = String(value || '').trim();
      if (normalized) return normalized;
    }
    return '';
  };

  const resolveTeacherDisplayName = (item = {}) => {
    return firstNonBlankText(
      item?.editedByDisplayName,
      item?.editedByFullName,
      item?.gradedByFullName,
      item?.editedByUsername,
      item?.gradedByUsername,
    ) || 'N/A';
  };

  const normalizeHistoryEntries = (entries = []) => {
    return entries
      .map((item, index) => ({
        id: item?.id ?? `history-${index}`,
        editedByDisplayName: resolveTeacherDisplayName(item),
        newBandScore: item?.newBandScore ?? item?.overallBandScore ?? item?.bandScore ?? null,
        newFeedback: item?.newFeedback ?? item?.overallFeedback ?? item?.feedback ?? null,
        editedAt: item?.editedAt || item?.gradedAt || item?.updatedAt || item?.createdAt || null,
      }))
      .sort((a, b) => {
        const timeA = a?.editedAt ? new Date(a.editedAt).getTime() : 0;
        const timeB = b?.editedAt ? new Date(b.editedAt).getTime() : 0;
        return timeB - timeA;
      });
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('vi-VN');
  };

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        console.log('🔍 Loading submission:', { id, type });
        let effectiveSource = sourceParam;

        if (!effectiveSource && type === 'writing') {
          try {
            const all = await teacherApi.getAllSubmissions();
            const targetId = String(id);
            const hasWriting = (all?.writingSubmissions || []).some((item) => String(item?.id) === targetId);
            const hasExam = (all?.examAttempts || []).some((item) => String(item?.id) === targetId);

            if (hasExam && !hasWriting) effectiveSource = 'exam';
            if (hasWriting && !hasExam) effectiveSource = 'writing';
          } catch (lookupError) {
            console.warn('Cannot pre-resolve submission source:', lookupError);
          }
        }

        if (effectiveSource === 'writing') {
          const data = await teacherApi.getWritingSubmission(id);
          setSubmission(data);
          setResolvedType('writing');
          setResolvedSource('writing');
          return;
        }

        if (effectiveSource === 'exam') {
          const data = await teacherApi.getExamAttemptDetail(id);
          const skill = String(data?.skillType || data?.examType || '');
          if (isWritingSkill(skill)) {
            setSubmission(await buildWritingLikeFromExamAttempt(data));
            setResolvedType('writing');
            setResolvedSource('exam');
          } else {
            let loadedSubmission = data;
            if (isSpeakingSkill(skill)) {
              try {
                const speakingAttempt = await teacherApi.getSpeakingAttempt(id);
                loadedSubmission = {
                  ...data,
                  ...speakingAttempt,
                  feedback: speakingAttempt?.feedback || data?.feedback || '',
                  score: speakingAttempt?.score || data?.score,
                };
              } catch (speakingError) {
                console.warn('Cannot load speaking attempt details:', speakingError);
              }
            }

            setSubmission(loadedSubmission);
            setResolvedType('exam');
            setResolvedSource('exam');

            if (loadedSubmission?.testId && loadedSubmission?.skillType) {
              try {
                const session = await ieltsApi.getTestSession(loadedSubmission.testId, loadedSubmission.skillType);
                setTotalSkillQuestions(countTotalQuestionsFromSession(session));
                setExamReviewSession(session);
              } catch (sessionError) {
                console.warn('Cannot load session to count total questions:', sessionError);
                setTotalSkillQuestions(0);
                setExamReviewSession(null);
              }
            }
          }
          return;
        }

        if (type === 'writing') {
          try {
            const data = await teacherApi.getWritingSubmission(id);
            console.log('✅ Writing submission loaded:', data);
            setSubmission(data);
            setResolvedType('writing');
            setResolvedSource('writing');
          } catch (writingErr) {
            // Some WRITING items in teacher list now come from exam-attempts pipeline.
            // Fallback to exam detail so the page still loads instead of failing 400.
            const examData = await teacherApi.getExamAttemptDetail(id);
            console.log('✅ Fallback exam attempt loaded for writing type:', examData);
            const skill = String(examData?.skillType || examData?.examType || '');

            if (isWritingSkill(skill)) {
              setSubmission(await buildWritingLikeFromExamAttempt(examData));
              setResolvedType('writing');
              setResolvedSource('exam');
            } else {
              let loadedSubmission = examData;
              if (isSpeakingSkill(skill)) {
                try {
                  const speakingAttempt = await teacherApi.getSpeakingAttempt(id);
                  loadedSubmission = {
                    ...examData,
                    ...speakingAttempt,
                    feedback: speakingAttempt?.feedback || examData?.feedback || '',
                    score: speakingAttempt?.score || examData?.score,
                  };
                } catch (speakingError) {
                  console.warn('Cannot load speaking attempt details:', speakingError);
                }
              }

              setSubmission(loadedSubmission);
              setResolvedType('exam');
              setResolvedSource('exam');
            }

            if (!isWritingSkill(skill) && examData?.testId && examData?.skillType) {
              try {
                const session = await ieltsApi.getTestSession(examData.testId, examData.skillType);
                setTotalSkillQuestions(countTotalQuestionsFromSession(session));
                setExamReviewSession(session);
              } catch (sessionError) {
                console.warn('Cannot load session to count total questions:', sessionError);
                setTotalSkillQuestions(0);
                setExamReviewSession(null);
              }
            }
          }
        } else {
          const data = await teacherApi.getExamAttemptDetail(id);
          console.log('✅ Exam attempt loaded:', data);
          const skill = String(data?.skillType || data?.examType || '');
          if (isWritingSkill(skill)) {
            setSubmission(await buildWritingLikeFromExamAttempt(data));
            setResolvedType('writing');
            setResolvedSource('exam');
          } else {
            let loadedSubmission = data;
            if (isSpeakingSkill(skill)) {
              try {
                const speakingAttempt = await teacherApi.getSpeakingAttempt(id);
                loadedSubmission = {
                  ...data,
                  ...speakingAttempt,
                  feedback: speakingAttempt?.feedback || data?.feedback || '',
                  score: speakingAttempt?.score || data?.score,
                };
              } catch (speakingError) {
                console.warn('Cannot load speaking attempt details:', speakingError);
              }
            }

            setSubmission(loadedSubmission);
            setResolvedType('exam');
            setResolvedSource('exam');
          }

          if (!isWritingSkill(skill) && data?.testId && data?.skillType) {
            try {
              const session = await ieltsApi.getTestSession(data.testId, data.skillType);
              setTotalSkillQuestions(countTotalQuestionsFromSession(session));
              setExamReviewSession(session);
            } catch (sessionError) {
              console.warn('Cannot load session to count total questions:', sessionError);
              setTotalSkillQuestions(0);
              setExamReviewSession(null);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading submission:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSubmission();
  }, [id, type, sourceParam]);

  useEffect(() => {
    const skill = String(submission?.skillType || submission?.examType || '');
    const isWritingSubmission = Boolean(submission) && (resolvedType === 'writing' || isWritingSkill(skill));
    const isSpeakingSubmission = Boolean(submission) && !isWritingSubmission && isSpeakingSkill(skill);
    const shouldLoadHistory = isWritingSubmission || isSpeakingSubmission;

    if (!shouldLoadHistory) {
      setHistoryLoading(false);
      setHistoryError('');
      setGradeHistory([]);
      return;
    }

    let cancelled = false;
    let timeoutId = null;

    const withTimeout = (promise, timeoutMs = 8000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('GRADE_HISTORY_TIMEOUT'));
          }, timeoutMs);
        }),
      ]);
    };

    const loadGradeHistory = async () => {
      setHistoryLoading(true);
      setHistoryError('');

      try {
        let rawHistory = [];

        if (isSpeakingSubmission || resolvedSource === 'exam') {
          const attemptId = submission?.sourceExamAttemptId || submission?.id || id;
          rawHistory = await withTimeout(teacherApi.getExamAttemptGradeHistory(attemptId));
        } else {
          const submissionId = submission?.id || id;
          rawHistory = await withTimeout(teacherApi.getWritingGradeHistory(submissionId));
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (cancelled) return;
        setGradeHistory(normalizeHistoryEntries(Array.isArray(rawHistory) ? rawHistory : []));
      } catch (historyLoadError) {
        if (cancelled) return;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        console.warn('Cannot load grade history:', historyLoadError);
        setHistoryError('Không tải được lịch sử chấm điểm. Vui lòng thử tải lại trang.');
        setGradeHistory([]);
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    loadGradeHistory();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [submission, resolvedType, resolvedSource, id]);

  if (loading) {
    return (
      <LmsLayout title="Đang tải..." subtitle="Vui lòng chờ">
        <div className="lms-panel" style={{ textAlign: 'center', padding: 40 }}>
          <p>Đang tải bài làm...</p>
        </div>
      </LmsLayout>
    );
  }

  if (!submission) {
    return (
      <LmsLayout title="Không tìm thấy" subtitle="Bài làm không tồn tại">
        <div className="lms-panel" style={{ textAlign: 'center', padding: 40 }}>
          <p>Không tìm thấy bài làm</p>
          <button className="lms-cta" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Quay lại
          </button>
        </div>
      </LmsLayout>
    );
  }

  const displayExamBand = (resolvedType !== 'writing')
    ? (submission.bandScore ?? calculateExamBand({
      skillType: submission.skillType || submission.examType,
      totalCorrect: submission.totalCorrect,
    }))
    : null;

  const submissionSkillType = String(submission?.skillType || submission?.examType || '');
  const resolvedAsWriting = resolvedType === 'writing' || isWritingSkill(submissionSkillType);
  const isSpeakingSubmission = !resolvedAsWriting && isSpeakingSkill(submissionSkillType);

  const normalizeQuestionKey = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const match = raw.match(/^q?(\d+)$/i);
    return match ? match[1] : raw;
  };

  const questionIdToPartLabelMap = (() => {
    const map = new Map();
    const parts = examReviewSession?.parts || [];

    parts.forEach((part, partIndex) => {
      const partNumber = Number(part?.partNumber);
      const resolvedPartNumber = Number.isFinite(partNumber) && partNumber > 0
        ? partNumber
        : (partIndex + 1);
      const partLabel = `Part ${resolvedPartNumber}`;

      (part?.questions || []).forEach((question) => {
        const key = normalizeQuestionKey(question?.id);
        if (key) {
          map.set(key, partLabel);
        }
      });
    });

    return map;
  })();

  const isLikelyAudioUrl = (value) => {
    const raw = String(value || '').trim();
    return /^(https?:\/\/|blob:|data:audio\/|\/)/i.test(raw);
  };

  const speakingRecordings = (() => {
    if (!isSpeakingSubmission) return [];
    const records = [];
    const seen = new Set();
    const urlToPartLabel = new Map();
    let fallbackPartCounter = 1;

    const resolvePartLabel = (normalizedUrl, preferredLabel) => {
      if (urlToPartLabel.has(normalizedUrl)) {
        return urlToPartLabel.get(normalizedUrl);
      }

      const nextLabel = preferredLabel || `Part ${fallbackPartCounter}`;
      urlToPartLabel.set(normalizedUrl, nextLabel);

      const matchedPart = String(nextLabel).match(/^Part\s+(\d+)$/i);
      if (matchedPart) {
        const partNo = Number(matchedPart[1]);
        if (Number.isFinite(partNo) && partNo >= fallbackPartCounter) {
          fallbackPartCounter = partNo + 1;
        }
      } else if (!preferredLabel) {
        fallbackPartCounter += 1;
      }

      return nextLabel;
    };

    const pushRecord = (url, preferredLabel) => {
      const normalizedUrl = String(url || '').trim();
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      if (!isLikelyAudioUrl(normalizedUrl)) return;

      const label = resolvePartLabel(normalizedUrl, preferredLabel);
      seen.add(normalizedUrl);
      records.push({ label, url: normalizedUrl });
    };

    (submission?.answers || []).forEach((answer, index) => {
      const questionKey = normalizeQuestionKey(answer?.questionId || index + 1);
      const partLabel = questionIdToPartLabelMap.get(questionKey) || null;
      pushRecord(answer?.audioUrl, partLabel);
      pushRecord(answer?.textAnswer, partLabel);
      pushRecord(answer?.selectedOptionLabel, partLabel);
    });

    if (Array.isArray(submission?.audioUrls)) {
      submission.audioUrls.forEach((url, index) => {
        pushRecord(url, `Part ${index + 1}`);
      });
    }

    if (submission?.audioUrl) {
      pushRecord(submission.audioUrl, null);
    }

    return records;
  })();

  const handleGoToGrade = () => {
    if (resolvedAsWriting) {
      const writeSource = resolvedSource === 'exam' ? 'exam' : 'writing';
      const gradeTargetId = writeSource === 'exam'
        ? (submission.sourceExamAttemptId || submission.id || id)
        : id;
      navigate(`/lms/grade/writing/${gradeTargetId}?source=${writeSource}`);
      return;
    }

    navigate(`/lms/grade/exam/${id}?source=exam`);
  };

  const renderGradeHistorySection = () => (
    <div className="lms-panel" style={{ marginBottom: 16 }}>
      <h3 className="lms-panel-title">Lịch sử chấm điểm</h3>

      {historyLoading && (
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Đang tải lịch sử chấm điểm...
        </div>
      )}

      {!historyLoading && historyError && (
        <div style={{ fontSize: 13, color: '#b91c1c' }}>
          {historyError}
        </div>
      )}

      {!historyLoading && !historyError && gradeHistory.length === 0 && (
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Chưa có lịch sử chấm điểm.
        </div>
      )}

      {!historyLoading && !historyError && gradeHistory.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="lms-table">
            <thead>
              <tr>
                <th>Giáo viên chấm</th>
                <th>Band</th>
                <th>Thời gian chấm bài</th>
                <th>Nhận xét</th>
              </tr>
            </thead>
            <tbody>
              {gradeHistory.map((entry, index) => {
                const hasBand = entry.newBandScore !== null && entry.newBandScore !== undefined;
                const feedbackText = String(entry.newFeedback || '').trim();

                return (
                  <tr key={`${entry.id}-${index}`}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{entry.editedByDisplayName}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f766e' }}>
                      {hasBand ? formatBand(entry.newBandScore) : 'N/A'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(entry.editedAt)}
                    </td>
                    <td style={{ minWidth: 280, whiteSpace: 'pre-wrap' }}>
                      {feedbackText || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  console.log('📊 Rendering submission:', submission);

  return (
    <LmsLayout title="Chi tiết bài làm" subtitle="Xem và chấm bài học viên">
      <div className="lms-panel" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="lms-cta ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Quay lại
        </button>

        <button className="lms-cta" onClick={handleGoToGrade}>
          <FileText size={14} /> Chấm bài
        </button>
      </div>

      {/* Thông tin học viên */}
      <div className="lms-panel" style={{ marginBottom: 16 }}>
        <h3 className="lms-panel-title">Thông tin</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Học viên</div>
            <div style={{ fontWeight: 600 }}><User size={14} style={{ display: 'inline', marginRight: 4 }} />{submission.username}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Loại bài</div>
            <div style={{ fontWeight: 600 }}>
              <FileText size={14} style={{ display: 'inline', marginRight: 4 }} />
              {resolvedType === 'writing' ? 'Writing' : (submission.skillType || submission.examType || 'Exam')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Thời gian nộp</div>
            <div style={{ fontWeight: 600 }}>
              <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
              {new Date(submission.submittedAt || submission.startedAt).toLocaleString('vi-VN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Thời gian làm bài</div>
            <div style={{ fontWeight: 600 }}>
              <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
              {formatDuration(getSubmissionDuration(submission))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Trạng thái</div>
            <span className={`lms-pill ${submission.status === 'SUBMITTED' ? 'warn' : 'success'}`}>
              {submission.status}
            </span>
          </div>
        </div>
      </div>

      {/* Nội dung bài làm */}
      {resolvedAsWriting && (
        <>
          <div className="lms-panel" style={{ marginBottom: 16 }}>
            <h3 className="lms-panel-title">Đề bài: {submission.groupTitle || 'N/A'}</h3>
            <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                Số từ: {submission.wordCount || 0}
              </div>
              {submission.submissionText ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {submission.submissionText}
                </div>
              ) : (
                <div style={{ color: '#ef4444', fontStyle: 'italic' }}>
                  ⚠️ Không có nội dung bài làm
                </div>
              )}
            </div>
          </div>

          {renderGradeHistorySection()}

        </>
      )}

      {!resolvedAsWriting && !isSpeakingSubmission && (
        <div className="lms-panel" style={{ marginBottom: 16 }}>
          <h3 className="lms-panel-title">Bài thi: {submission.examTitle}</h3>
          <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Điểm: </span>
              <span style={{ fontWeight: 600, fontSize: 18, color: '#16a34a' }}>
                {formatBand(displayExamBand)} / 9.0
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Số câu đúng: {submission.totalCorrect || 0} / {(totalSkillQuestions || submission.totalAnswered || 0)}
            </div>
          </div>
        </div>
      )}

      {isSpeakingSubmission && (
        <>
          <div className="lms-panel" style={{ marginBottom: 16 }}>
            <h3 className="lms-panel-title">Đề bài: {submission.testTitle || submission.examTitle || 'Speaking Test'}</h3>

            <div style={{
              padding: 14,
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: 8,
              color: '#92400e',
              marginBottom: 14,
              fontStyle: 'italic'
            }}>
              Bài nói được chấm theo rubric IELTS Speaking.
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {speakingRecordings.length > 0 ? (
                speakingRecordings.map((record, index) => (
                  <div
                    key={`${record.url}-${index}`}
                    style={{
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 12
                    }}
                  >
                    <div style={{ fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: 600 }}>
                      {record.label}
                    </div>
                    <audio controls src={record.url} style={{ width: '100%' }} />
                  </div>
                ))
              ) : (
                <div style={{
                  padding: 14,
                  borderRadius: 8,
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  background: '#f8fafc'
                }}>
                  Chưa có file thu âm để phát lại.
                </div>
              )}

              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Band hiện tại: <strong style={{ color: '#16a34a' }}>{formatBand(displayExamBand)} / 9.0</strong>
              </div>
            </div>
          </div>

          {renderGradeHistorySection()}
        </>
      )}

    </LmsLayout>
  );
}
