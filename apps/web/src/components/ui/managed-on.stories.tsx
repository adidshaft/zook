import { ManagedOn } from "./managed-on";

export default { title: "UI/ManagedOn", component: ManagedOn };

export function Basic() {
  return (
    <ManagedOn surface="trainer-mobile">
      Plans are created and published by trainers in the mobile app.
    </ManagedOn>
  );
}
