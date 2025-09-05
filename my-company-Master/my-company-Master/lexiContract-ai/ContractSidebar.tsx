import { Contract } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AssignTeamDropdown from './AssignTeamDropdown';

interface ContractSidebarProps {
  contract: Contract;
}

export default function ContractSidebar({ contract }: ContractSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Status</p>
          <p className="capitalize">{contract.negotiation_status.replace('_', ' ').toLowerCase()}</p>
        </div>
        <AssignTeamDropdown contractId={contract.id} currentTeamId={contract.team_id} />
      </CardContent>
    </Card>
  );
}
