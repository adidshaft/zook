import { RadioCardGroup } from "./radio-card-group";

const options = [
  { value: "duration", label: "Duration", description: "Days only" },
  { value: "visits", label: "Visit pack", description: "Visits only" },
];

export default { title: "UI/RadioCardGroup", component: RadioCardGroup };

export function Basic() {
  return (
    <RadioCardGroup
      name="plan-shape"
      label="Plan shape"
      value="duration"
      options={options}
      onChange={() => undefined}
    />
  );
}
