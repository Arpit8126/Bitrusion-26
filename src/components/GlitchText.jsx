import { useState, useEffect } from 'react';

export default function GlitchText({ text, tag: Tag = 'h1', className = '' }) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tag
      className={`glitch-text ${isGlitching ? 'glitching' : ''} ${className}`}
      data-text={text}
    >
      {text}
    </Tag>
  );
}
