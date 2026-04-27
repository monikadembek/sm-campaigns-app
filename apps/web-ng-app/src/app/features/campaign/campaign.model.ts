export interface CampaignForm {
  name: string;
  goalId: number;
  audience: string;
  startDate: Date | string;
  endDate: Date | string;
  status: string;
  notes: string;
}
