import { ReportConfig } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Props {
  config: ReportConfig;
  setConfig: (config: ReportConfig) => void;
}

export default function DataSourceSelector({ config, setConfig }: Props) {
  const handleChange = (value: 'contracts' | 'analysis_suggestions') => {
    setConfig({ ...config, dataSource: value });
  };

  return (
    <div className="grid gap-3">
      <Label htmlFor="data-source">Data Source</Label>
      <Select value={config.dataSource} onValueChange={handleChange}>
        <SelectTrigger id="data-source" aria-label="Select data source">
          <SelectValue placeholder="Select data source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="contracts">Contracts</SelectItem>
          <SelectItem value="analysis_suggestions">Analysis Suggestions</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}