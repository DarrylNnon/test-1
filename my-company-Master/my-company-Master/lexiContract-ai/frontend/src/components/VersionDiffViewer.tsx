'use client';

import { parsePatch } from 'diff';

interface VersionDiffViewerProps {
  diffText: string;
}

const VersionDiffViewer = ({ diffText }: VersionDiffViewerProps) => {
  if (!diffText) {
    return (
      <div className="bg-white p-6 shadow rounded-lg text-center text-gray-500">
        Select two different versions to see the comparison.
      </div>
    );
  }

  const [diff] = parsePatch(diffText);

  if (!diff) {
    return (
      <div className="bg-white p-6 shadow rounded-lg text-center text-gray-500">
        Could not parse the difference between versions.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 shadow rounded-lg font-mono text-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4 font-sans">Version Comparison</h3>
      <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
        <pre>
          {diff.hunks.map((hunk, hunkIndex) => (
            <div key={`hunk-${hunkIndex}`}>
              <div className="bg-gray-200 text-gray-500 px-2 py-1">
                {hunk.header}
              </div>
              {hunk.lines.map((line, lineIndex) => {
                const lineType = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'context';
                const bgClass =
                  lineType === 'add' ? 'bg-green-100' : lineType === 'del' ? 'bg-red-100' : '';
                const textClass =
                  lineType === 'add' ? 'text-green-800' : lineType === 'del' ? 'text-red-800' : 'text-gray-600';

                return (
                  <div key={`line-${lineIndex}`} className={`${bgClass} ${textClass} flex`}>
                    <span className="w-10 text-right pr-2 select-none text-gray-400">
                      {lineType === 'add' ? '+' : lineType === 'del' ? '-' : ' '}
                    </span>
                    <span className="flex-1">{line.substring(1)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
};

export default VersionDiffViewer;