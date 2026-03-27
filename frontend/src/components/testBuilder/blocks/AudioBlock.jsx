import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Image, ChevronUp, ChevronDown, Upload, Link as LinkIcon } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, loadAudioFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const AudioBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, children }) => {
  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    loadAudioFile(file, (audioUrl) => onUpdate(group.id, { audioUrl }));
  };

  return (
    <div className={`exam-group${selected ? ' selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
      <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
      <div className="exam-audio-player">
        <button className="exam-audio-play-btn" type="button" title="Phát audio">
          <span className="exam-audio-play-glyph" aria-hidden="true" />
        </button>
        <div className="exam-audio-bar" />
        <span className="exam-audio-time">0:00 / --:--</span>

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
      {children}
    </div>
  );
};


export default AudioBlock;
