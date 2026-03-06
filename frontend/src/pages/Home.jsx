import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>DAVictory</h1>
            <p style={{ color: '#555', marginBottom: '40px' }}>Nền tảng luyện thi IELTS</p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                    to="/test/reading"
                    style={{
                        padding: '14px 28px',
                        background: '#3b5998',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        fontSize: '15px',
                    }}
                >
                    IELTS Reading Test
                </Link>
                <Link
                    to="/test/listening"
                    style={{
                        padding: '14px 28px',
                        background: '#107c41',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        fontSize: '15px',
                    }}
                >
                    IELTS Listening Test
                </Link>
            </div>
        </div>
    );
};

export default Home;
