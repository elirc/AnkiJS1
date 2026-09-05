export interface StudyPreferences {
  new_per_day: number;
  request_retention: number;
}

export const defaultStudyPreferences: StudyPreferences = {
  new_per_day: 10,
  request_retention: 0.9,
};

export function normalizeStudyPreferences(
  value?: Partial<StudyPreferences> | null,
): StudyPreferences {
  return {
    new_per_day:
      typeof value?.new_per_day === "number" &&
      Number.isInteger(value.new_per_day) &&
      value.new_per_day >= 0 &&
      value.new_per_day <= 50
        ? value.new_per_day
        : defaultStudyPreferences.new_per_day,
    request_retention: [0.85, 0.9, 0.95].includes(value?.request_retention ?? 0)
      ? value!.request_retention!
      : defaultStudyPreferences.request_retention,
  };
}
