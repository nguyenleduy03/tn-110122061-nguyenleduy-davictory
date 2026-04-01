import { assignmentApi } from '../services/assignmentApi';

/**
 * Submit test result to assignment
 * @param {number} assignmentId - Assignment ID
 * @param {number} examAttemptId - Exam attempt ID from test submission
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onSuccess - Optional callback on success
 * @param {Function} onError - Optional callback on error
 */
export const submitTestToAssignment = async (
  assignmentId,
  examAttemptId,
  navigate,
  onSuccess,
  onError
) => {
  try {
    await assignmentApi.submitTest(assignmentId, examAttemptId);
    if (onSuccess) onSuccess();
    navigate(`/student/assignments/${assignmentId}/result`);
  } catch (err) {
    console.error('[Assignment] Submit test failed:', err);
    if (onError) onError(err);
  }
};
