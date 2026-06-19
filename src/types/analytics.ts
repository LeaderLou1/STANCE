export interface WorkOrderData {
  id: string;
  dispatched_at: string;
  completed_at: string | null;
  assigned_contractor: string;
  issue: {
    title: string;
    urgency: string;
  };
}

export interface CampaignAnalyticsData {
  county_name: string;
  district_number: string;
  category: string;
  volume_of_concern: number;
  aggregate_voter_friction: number;
  resolution_rate: number;
}
