import type { HomeState } from "./state";
import ExpiredCard from "./cards/expired-card";
import FirstRunCard from "./cards/first-run-card";
import InProgressCard from "./cards/in-progress-card";
import LoggedCard from "./cards/logged-card";
import MembershipPendingCard from "./cards/membership-pending-card";
import MembershipBlockedCard from "./cards/membership-blocked-card";
import NoOrgCard from "./cards/no-org-card";
import NoPlanCard from "./cards/no-plan-card";
import RestDayCard from "./cards/rest-day-card";
import WorkoutCard from "./cards/workout-card";

export function renderHomeCard(state: HomeState) {
  switch (state.kind) {
    case "noOrg":
      return <NoOrgCard />;
    case "expiredMembership":
      return <ExpiredCard />;
    case "membershipBlocked":
      return <MembershipBlockedCard reason={state.reason} />;
    case "membershipPendingActivation":
      return <MembershipPendingCard gymName={state.gymName} />;
    case "noPlan":
      return <NoPlanCard gymName={state.gymName} daysLeft={state.daysLeft} />;
    case "todayRest":
      return <RestDayCard planName={state.planName} streak={state.streak} />;
    case "todayWorkout":
      return (
        <WorkoutCard
          planName={state.planName}
          assignmentId={state.assignmentId}
          estimatedMinutes={state.estimatedMinutes}
        />
      );
    case "workoutInProgress":
      return <InProgressCard assignmentId={state.assignmentId} />;
    case "workoutLoggedToday":
      return <LoggedCard nextPlanName={state.nextPlanName} streak={state.streak} />;
    case "firstRun":
      return <FirstRunCard gymUsername={state.gymUsername} />;
  }
}
