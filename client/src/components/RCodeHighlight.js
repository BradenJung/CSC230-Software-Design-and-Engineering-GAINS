import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs, atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

/**
 * Component for syntax-highlighted R code display
 * Supports dark, light, and night themes
 */
export default function RCodeHighlight({ code, theme = 'dark', className = '' }) {
  // Map theme names to syntax highlighter styles
  const themeStyles = {
    dark: vscDarkPlus,
    light: vs,
    night: atomDark
  };

  const selectedStyle = themeStyles[theme] || vscDarkPlus;

  return (
    <SyntaxHighlighter
      language="r"
      style={selectedStyle}
      customStyle={{
        margin: 0,
        background: 'transparent',
        fontSize: '12px',
        lineHeight: '1.5',
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
      }}
      className={className}
    >
      {code}
    </SyntaxHighlighter>
  );
}

