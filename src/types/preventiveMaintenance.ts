export type CreatePreventiveMaintenancePayload = {
  robot_no: string;
  robot_type: string;
  client_id: string;
  site_name: string;
  site_id: string;
  site_location: string;
  physical_condition_of_transPipe_condition: string;
  physical_condition_of_transPipe_image: string;
  physical_condition_of_channel_condition: string;
  physical_condition_of_channel_image: string;
  physical_condition_of_top_bottom_cover_condition: string;
  physical_condition_of_top_bottom_cover_image: string;
  oiling_need_for_bearing_condition: string;
  oiling_need_for_bearing_condition_image: string;
  oiling_need_for_coupling_condition: string;
  oiling_need_for_coupling_image: string;
  oiling_need_for_motors_condition: string;
  oiling_need_for_motors_image: string;
  mf_clothes_alignment: string;
  wheels_alignment: string;
  is_wheels_loose: string;
  is_nutbolt_loose: string;
  start_date: string;
  end_date: string;
};

export type UpdatePreventiveMaintenancePayload =
  CreatePreventiveMaintenancePayload & {
    pm_id?: string;
    [key: string]: unknown;
  };

export type PmLastActivity = {
  name?: string;
  email?: string;
  profile_image?: string;
  details?: string;
  timestamp?: string;
  role?: string;
};

export type PmRobotRecord = {
  _id: string;
  pm_id?: string;
  robot_no?: string;
  robot_type?: string;
  client_id?: string;
  site_id?: string;
  site_name?: string;
  site_location?: string;
  start_date?: string;
  end_date?: string;
  physical_condition_of_transPipe_condition?: string;
  physical_condition_of_transPipe_image?: string;
  physical_condition_of_channel_condition?: string;
  physical_condition_of_channel_image?: string;
  physical_condition_of_top_bottom_cover_condition?: string;
  physical_condition_of_top_bottom_cover_image?: string;
  oiling_need_for_bearing_condition?: string;
  oiling_need_for_bearing_condition_image?: string;
  oiling_need_for_coupling_condition?: string;
  oiling_need_for_coupling_image?: string;
  oiling_need_for_motors_condition?: string;
  oiling_need_for_motors_image?: string;
  mf_clothes_alignment?: string;
  wheels_alignment?: string;
  is_wheels_loose?: string | boolean;
  is_nutbolt_loose?: string | boolean;
  last_activity?: PmLastActivity[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type PmClientGroup = {
  robots: PmRobotRecord[];
  [key: string]: unknown;
};

export type PreventiveMaintenanceResult = {
  data: PmClientGroup[];
  site_count?: number;
  record_count?: number;
  start_date?: string;
  end_date?: string;
  site_id?: string;
  site_name?: string;
  site_location?: string;
};

export type PmCheckItem = {
  label: string;
  condition?: string | boolean;
  image?: string;
  isBool?: boolean;
};

export function flattenPmRobots(result: PreventiveMaintenanceResult | null) {
  if (!result?.data?.length) return [] as PmRobotRecord[];
  return result.data.flatMap((group) => group.robots ?? []);
}

export function pmRecordHasIssue(record: PmRobotRecord) {
  const yes = (v: unknown) =>
    v === true || v === 'Yes' || v === 'yes' || v === 'true';

  return (
    yes(record.oiling_need_for_motors_condition) ||
    yes(record.oiling_need_for_bearing_condition) ||
    yes(record.oiling_need_for_coupling_condition) ||
    yes(record.is_wheels_loose) ||
    yes(record.is_nutbolt_loose)
  );
}

export function getPmPhysicalChecks(record: PmRobotRecord): PmCheckItem[] {
  return [
    {
      label: 'TransPipe',
      condition: record.physical_condition_of_transPipe_condition,
      image: record.physical_condition_of_transPipe_image,
    },
    {
      label: 'Channel',
      condition: record.physical_condition_of_channel_condition,
      image: record.physical_condition_of_channel_image,
    },
    {
      label: 'Top / Bottom cover',
      condition: record.physical_condition_of_top_bottom_cover_condition,
      image: record.physical_condition_of_top_bottom_cover_image,
    },
  ];
}

export function getPmOilingChecks(record: PmRobotRecord): PmCheckItem[] {
  return [
    {
      label: 'Bearing',
      condition: record.oiling_need_for_bearing_condition,
      image: record.oiling_need_for_bearing_condition_image,
    },
    {
      label: 'Coupling',
      condition: record.oiling_need_for_coupling_condition,
      image: record.oiling_need_for_coupling_image,
    },
    {
      label: 'Motors',
      condition: record.oiling_need_for_motors_condition,
      image: record.oiling_need_for_motors_image,
    },
  ];
}

export function getPmAlignmentChecks(record: PmRobotRecord): PmCheckItem[] {
  return [
    { label: 'MF clothes', condition: record.mf_clothes_alignment },
    { label: 'Wheels alignment', condition: record.wheels_alignment },
    {
      label: 'Wheels loose?',
      condition: record.is_wheels_loose,
      isBool: true,
    },
    {
      label: 'Nut-bolts loose?',
      condition: record.is_nutbolt_loose,
      isBool: true,
    },
  ];
}

export function collectPmImages(record: PmRobotRecord) {
  return [
    ...getPmPhysicalChecks(record),
    ...getPmOilingChecks(record),
  ]
    .filter((c) => typeof c.image === 'string' && c.image.length > 0)
    .map((c) => ({ src: c.image as string, label: c.label }));
}
