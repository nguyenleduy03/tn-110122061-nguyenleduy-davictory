import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus, Image, ChevronUp, ChevronDown, Upload, Link as LinkIcon } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, loadAudioFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';
import { resolveDrivePreviewUrl } from '../../../utils/mediaUrl';

const AudioBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, testTitle, testId, module = 'LISTENING' }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioSrc = useMemo(() => resolveDrivePreviewUrl(group.audioUrl || ''), [group.audioUrl]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Ignore reset failures for unloaded media.
      }
    }
  }, [audioSrc]);

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    loadAudioFile(file, (audioUrl) => onUpdate(group.id, { audioUrl }), module, testTitle, testId, group.contentType || 'AUDIO_TRANSCRIPT');
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const syncTime = () => {
      setCurrentTime(Number.isFinite(audio.currentTime) ? audio.currentTime : 0);
    };

    const syncDuration = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    audio.addEventListener('timeupdate', syncTime);
    audio.addEventListener('loadedmetadata', syncDuration);
    audio.addEventListener('durationchange', syncDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', syncTime);
      audio.removeEventListener('loadedmetadata', syncDuration);
      audio.removeEventListener('durationchange', syncDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioSrc]);

  const handleTogglePlay = async (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (err) {
      console.error('Audio playback failed:', err);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    const nextTime = Number(e.target.value);
    if (!Number.isFinite(nextTime)) return;

    setCurrentTime(nextTime);
    try {
      audio.currentTime = nextTime;
    } catch {
      // Ignore seek errors while metadata is still loading.
    }
  };

  const formattedCurrent = `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;
  const formattedDuration = duration > 0
    ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`
    : '--:--';
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      <div className="exam-audio-player">
        <audio ref={audioRef} src={audioSrc || undefined} preload="metadata" />
        <button
          className="exam-audio-play-btn"
          type="button"
          title={isPlaying ? 'Tạm dừng' : 'Phát audio'}
          onClick={handleTogglePlay}
          disabled={!audioSrc}
        >
          <span className={`exam-audio-play-glyph${isPlaying ? ' is-paused' : ''}`} aria-hidden="true" />
        </button>
        <div className="exam-audio-progress-wrap">
          <input
            className="exam-audio-seek"
            type="range"
            min="0"
            step="0.1"
            max={duration > 0 ? duration : 0}
            value={Math.min(currentTime, duration || currentTime)}
            onChange={handleSeek}
            disabled={!audioSrc || duration <= 0}
            style={{
              background: duration > 0
                ? `linear-gradient(to right, #1d2f5e 0%, #1d2f5e ${progress}%, #e2e8f0 ${progress}%, #e2e8f0 100%)`
                : '#e2e8f0',
            }}
          />
          <div className="exam-audio-time-row">
            <span className="exam-audio-time">{formattedCurrent}</span>
            <span className="exam-audio-time">/ {formattedDuration}</span>
          </div>
        </div>

        <div className="exam-audio-source-wrap">
          <div className="exam-audio-url-wrap">
            <LinkIcon size={13} />
            <input
              className="exam-audio-url-input"
              placeholder="Dán URL audio..."
              value={group.audioUrl || ''}
              onChange={(e) => onUpdate(group.id, { audioUrl: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <label className="exam-audio-upload-btn" title="Tải file audio">
            <Upload size={13} />
            <span>Tải file</span>
            <input
              type="file"
              accept="audio/*"
              hidden
              onClick={(e) => e.stopPropagation()}
              onChange={handleAudioUpload}
            />
          </label>
        </div>
      </div>
    </div>
  );
};


export default AudioBlock;
