import type { CreatePreventiveMaintenancePayload } from '../../types/preventiveMaintenance';

export type PmFormFieldKey = keyof CreatePreventiveMaintenancePayload;

export type PmConditionField = {
  key: PmFormFieldKey;
  label: string;
  options: 'ok' | 'yes';
  required?: boolean;
};

export type PmPhotoField = {
  key: PmFormFieldKey;
  label: string;
};

export const PM_CONDITION_FIELDS: PmConditionField[] = [
  {
    key: 'physical_condition_of_transPipe_condition',
    label: 'TransPipe condition',
    options: 'ok',
    required: true,
  },
  {
    key: 'physical_condition_of_channel_condition',
    label: 'Channel condition',
    options: 'ok',
    required: true,
  },
  {
    key: 'physical_condition_of_top_bottom_cover_condition',
    label: 'Top / Bottom cover',
    options: 'ok',
  },
  {
    key: 'oiling_need_for_bearing_condition',
    label: 'Oiling – bearing',
    options: 'yes',
    required: true,
  },
  {
    key: 'oiling_need_for_coupling_condition',
    label: 'Oiling – coupling',
    options: 'yes',
  },
  {
    key: 'oiling_need_for_motors_condition',
    label: 'Oiling – motors',
    options: 'yes',
  },
  {
    key: 'mf_clothes_alignment',
    label: 'MF clothes alignment',
    options: 'ok',
  },
  {
    key: 'wheels_alignment',
    label: 'Wheels alignment',
    options: 'ok',
  },
  {
    key: 'is_wheels_loose',
    label: 'Wheels loose?',
    options: 'yes',
  },
  {
    key: 'is_nutbolt_loose',
    label: 'Nut-bolts loose?',
    options: 'yes',
  },
];

export const PM_PHOTO_FIELDS: PmPhotoField[] = [
  {
    key: 'physical_condition_of_transPipe_image',
    label: 'TransPipe photo',
  },
  {
    key: 'physical_condition_of_channel_image',
    label: 'Channel photo',
  },
  {
    key: 'physical_condition_of_top_bottom_cover_image',
    label: 'Cover photo',
  },
  {
    key: 'oiling_need_for_bearing_condition_image',
    label: 'Bearing photo',
  },
  {
    key: 'oiling_need_for_coupling_image',
    label: 'Coupling photo',
  },
  {
    key: 'oiling_need_for_motors_image',
    label: 'Motors photo',
  },
];

export const PM_OK_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'OK', label: 'OK' },
  { value: 'Not OK', label: 'Not OK' },
];

export const PM_YES_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

export const PM_META_FIELDS: { key: string; label: string }[] = [
  { key: 'pm_id', label: 'PM ID' },
  { key: 'robot_no', label: 'Robot no' },
  { key: 'robot_type', label: 'Robot type' },
  { key: 'client_id', label: 'Client ID' },
  { key: 'site_name', label: 'Site name' },
  { key: 'site_id', label: 'Site ID' },
  { key: 'site_location', label: 'Site location' },
];

export function toDateOnly(value?: string) {
  if (!value) return '';
  return value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
}
