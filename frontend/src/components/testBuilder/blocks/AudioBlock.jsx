import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Volume2, Image, ChevronUp, ChevronDown } from 'lucide-react';
import GroupToolbar from './shared/GroupToolbar';
import RichInput from '../../common/RichInput';
import RichBlankEditor from './shared/RichBlankEditor';
import { toRoman, loadImageFile, toPlainText, countBlankTokens, getNextQuestionNumber, isImagePinQuestion, isNoteBlankQuestion, getQuestionWeight } from './shared/blockHelpers';

const AudioBlock = ({ group, onUpdate, onDelete, onSelect, selected, dragHandleProps, children }) => (
  <div className={`exam-group${selected ? ' selected' : ''}`}
    onClick={(e) => { e.stopPropagation(); onSelect(group); }}>
    <GroupToolbar group={group} dragHandleProps={dragHandleProps} onDelete={onDelete} />
    <div className="exam-audio-player">
      <button className="exam-audio-play-btn"><Volume2 size={15} /></button>
      <div className="exam-audio-bar" />
      <span className="exam-audio-time">0:00 / --:--</span>
      <input className="exam-audio-url-input" placeholder="URL audio..."
        value={group.audioUrl || ''}
        onChange={(e) => onUpdate(group.id, { audioUrl: e.target.value })}
        onClick={(e) => e.stopPropagation()} />
    </div>
    {children}
  </div>
);


export default AudioBlock;
