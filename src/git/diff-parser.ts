export type ChangeType = 'added' | 'modified' | 'deleted' | 'renamed';

export interface ChangedFile {
  path: string;
  changeType: ChangeType;
  oldPath?: string;
}

export function parseDiffOutput(output: string): ChangedFile[] {
  const lines = output.trim().split('\n').filter(Boolean);
  return lines.map(parseDiffLine);
}

function parseDiffLine(line: string): ChangedFile {
  const parts = line.split('\t');
  const status = parts[0];

  if (status.startsWith('R')) {
    return {
      path: parts[2],
      changeType: 'renamed',
      oldPath: parts[1],
    };
  }

  const changeType = statusToChangeType(status);
  return {
    path: parts[1],
    changeType,
  };
}

function statusToChangeType(status: string): ChangeType {
  switch (status[0]) {
    case 'A': return 'added';
    case 'M': return 'modified';
    case 'D': return 'deleted';
    case 'R': return 'renamed';
    default: return 'modified';
  }
}
