import React from 'react';
import { Wifi, Bell, Menu } from 'lucide-react';

const TestHeader = ({ candidateName, candidateId, extraInfo }) => {
    return (
        <header className="ielts-header">
            <div className="header-left">
                <div className="ielts-logo">IELTS</div>
                <div className="candidate-info">
                    {candidateId}
                    {extraInfo && (
                        <div
                            className="extra-header-info"
                            style={{ marginLeft: '15px', color: '#333', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                            {extraInfo}
                        </div>
                    )}
                </div>
            </div>
            <div className="header-right">
                <button className="icon-btn"><Wifi size={22} /></button>
                <button className="icon-btn"><Bell size={22} /></button>
                <button className="icon-btn"><Menu size={26} /></button>
            </div>
        </header>
    );
};

export default TestHeader;
