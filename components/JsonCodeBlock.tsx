import React from 'react';

interface JsonCodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export const JsonCodeBlock: React.FC<JsonCodeBlockProps> = ({
  code,
  language = 'json',
  className = '',
}) => {
  return (
    <pre
      className={`json-code-block font-mono text-xs rounded-md p-3 overflow-x-auto leading-relaxed ${className}`}
      style={{
        backgroundColor: 'var(--Neutral-15, #1e293b)',
        color: '#e2e8f0',
        border: '1px solid var(--Neutral-25, #334155)',
        margin: '6px 0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <code>{code}</code>
    </pre>
  );
};

export default JsonCodeBlock;
