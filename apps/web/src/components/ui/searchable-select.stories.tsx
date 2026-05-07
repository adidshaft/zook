import { SearchableSelect } from "./searchable-select";

const options = [
  { value: "branch-a", label: "Koregaon Park", description: "Default branch" },
  { value: "branch-b", label: "Aundh" },
  { value: "branch-c", label: "Bandra" },
];

export default { title: "UI/SearchableSelect", component: SearchableSelect };

export function Basic() {
  return (
    <SearchableSelect
      label="Select branch"
      options={options}
      value="branch-a"
      onChange={() => undefined}
    />
  );
}
