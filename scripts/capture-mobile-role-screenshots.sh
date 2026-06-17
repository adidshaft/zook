#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <ios|android> <output-dir> [group]" >&2
  exit 1
fi

platform="$1"
output_dir="$2"
capture_group="${3:-all}"
capture_base_url="${CAPTURE_BASE_URL:-}"

detect_ios_udid() {
  if [[ -n "${IOS_UDID:-}" ]]; then
    printf '%s\n' "$IOS_UDID"
    return 0
  fi

  local booted
  booted="$(
    xcrun simctl list devices booted |
      awk -F '[()]' '/Zook QA iPhone 16 Pro/ && /Booted/ { print $2; exit }'
  )"
  if [[ -n "$booted" ]]; then
    printf '%s\n' "$booted"
    return 0
  fi

  booted="$(xcrun simctl list devices booted | awk -F '[()]' '/Booted/ { print $2; exit }')"
  if [[ -n "$booted" ]]; then
    printf '%s\n' "$booted"
    return 0
  fi

  printf '%s\n' "9D8911DA-9294-46E2-926C-1CD0CEC70CBE"
}

ios_udid="$(detect_ios_udid)"
capture_settle_seconds="${CAPTURE_SETTLE_SECONDS:-8}"
android_ui_dump_path="${TMPDIR:-/tmp}/zook-android-ui.xml"

if [[ "$platform" == "android" ]]; then
  capture_settle_seconds="${CAPTURE_SETTLE_SECONDS:-18}"
fi

mkdir -p \
  "$output_dir/public" \
  "$output_dir/onboarding" \
  "$output_dir/member" \
  "$output_dir/owner" \
  "$output_dir/admin" \
  "$output_dir/trainer" \
  "$output_dir/reception"

open_url() {
  local url="$1"
  if [[ -n "$capture_base_url" && "$url" == zook:///* ]]; then
    local route_path="${url#zook:///}"
    if [[ "$capture_base_url" == */-- ]]; then
      url="${capture_base_url}/${route_path}"
    else
      url="${capture_base_url%/}/${route_path}"
    fi
  fi
  if [[ "$platform" == "ios" ]]; then
    if [[ "$url" == zook:///* ]]; then
      xcrun simctl launch "$ios_udid" com.zook.app --url "$url" >/dev/null
    else
      xcrun simctl openurl "$ios_udid" "$url" >/dev/null
    fi
  else
    adb shell "am start -W -a android.intent.action.VIEW -d '$url'" >/dev/null
  fi
}

warm_launch() {
  if [[ "$platform" == "ios" ]]; then
    xcrun simctl launch "$ios_udid" com.zook.app >/dev/null || true
    sleep 2
  elif [[ "$platform" == "android" ]]; then
    adb shell monkey -p com.zook.app -c android.intent.category.LAUNCHER 1 >/dev/null
    sleep 2
  fi
}

dismiss_capture_obstructions() {
  if [[ "$platform" == "android" ]]; then
    # Expo/Metro warning trays can cover the bottom navigation during QA
    # captures. The warning appears in different vertical positions depending on
    # the runtime, so sweep a few likely close-button coordinates. These taps
    # are harmless when the tray is absent.
    local coords=(
      "1010 120"
      "1010 180"
      "1010 240"
      "1010 2190"
    )
    local pair
    for pair in "${coords[@]}"; do
      adb shell input tap ${pair} >/dev/null 2>&1 || true
      sleep 0.2
    done
    sleep 0.6
  fi
}

dump_android_ui() {
  local attempt
  for attempt in 1 2 3; do
    if python3 - "$android_ui_dump_path" <<'PY'
import subprocess
import sys

output_path = sys.argv[1]
try:
    result = subprocess.run(
        ["adb", "exec-out", "uiautomator", "dump", "/dev/tty"],
        check=True,
        capture_output=True,
        text=True,
        timeout=12,
    )
except Exception:
    raise SystemExit(1)

xml = result.stdout
start = xml.find("<?xml")
end = xml.rfind("</hierarchy>")
if start == -1 or end == -1:
    raise SystemExit(1)
with open(output_path, "w", encoding="utf-8") as handle:
    handle.write(xml[start:end + len("</hierarchy>")])
PY
    then
      return 0
    fi
    sleep 1
  done
  return 1
}

android_bounds_for_id() {
  local resource_id="$1"
  dump_android_ui
  python3 - "$android_ui_dump_path" "$resource_id" <<'PY'
import re
import sys

xml_path, resource_id = sys.argv[1], sys.argv[2]
with open(xml_path, "r", encoding="utf-8") as handle:
    xml = handle.read()
pattern = re.compile(
    rf'resource-id="{re.escape(resource_id)}".*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
)
match = pattern.search(xml)
if not match:
    raise SystemExit(1)
print(" ".join(match.groups()))
PY
}

android_bounds_for_text() {
  local text="$1"
  dump_android_ui
  python3 - "$android_ui_dump_path" "$text" <<'PY'
import re
import sys

xml_path, text = sys.argv[1], sys.argv[2]
with open(xml_path, "r", encoding="utf-8") as handle:
    xml = handle.read()
pattern = re.compile(rf'text="{re.escape(text)}".*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
match = pattern.search(xml)
if not match:
    raise SystemExit(1)
print(" ".join(match.groups()))
PY
}

android_bounds_for_desc() {
  local content_desc="$1"
  dump_android_ui
  python3 - "$android_ui_dump_path" "$content_desc" <<'PY'
import re
import sys

xml_path, content_desc = sys.argv[1], sys.argv[2]
with open(xml_path, "r", encoding="utf-8") as handle:
    xml = handle.read()
pattern = re.compile(
    rf'content-desc="{re.escape(content_desc)}".*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
)
match = pattern.search(xml)
if not match:
    raise SystemExit(1)
print(" ".join(match.groups()))
PY
}

android_tap_id() {
  local resource_id="$1"
  local bounds
  bounds="$(android_bounds_for_id "$resource_id")" || return 1
  read -r x1 y1 x2 y2 <<<"$bounds"
  local x=$(((x1 + x2) / 2))
  local y=$(((y1 + y2) / 2))
  adb shell input tap "$x" "$y" >/dev/null
}

android_tap_text() {
  local text="$1"
  local bounds
  bounds="$(android_bounds_for_text "$text")" || return 1
  read -r x1 y1 x2 y2 <<<"$bounds"
  local x=$(((x1 + x2) / 2))
  local y=$(((y1 + y2) / 2))
  adb shell input tap "$x" "$y" >/dev/null
}

android_tap_desc() {
  local content_desc="$1"
  local bounds
  bounds="$(android_bounds_for_desc "$content_desc")" || return 1
  read -r x1 y1 x2 y2 <<<"$bounds"
  local x=$(((x1 + x2) / 2))
  local y=$(((y1 + y2) / 2))
  adb shell input tap "$x" "$y" >/dev/null
}

android_scroll_until_id() {
  local resource_id="$1"
  local attempt
  for attempt in {1..20}; do
    if android_bounds_for_id "$resource_id" >/dev/null 2>&1; then
      return 0
    fi
    adb shell input swipe 540 2100 540 950 250 >/dev/null
    sleep 1
  done
  return 1
}

android_scroll_until_text() {
  local text="$1"
  local attempt
  for attempt in {1..20}; do
    if android_bounds_for_text "$text" >/dev/null 2>&1; then
      return 0
    fi
    adb shell input swipe 540 2100 540 950 250 >/dev/null
    sleep 1
  done
  return 1
}

android_reset_qa_scroll() {
  return 0
}

android_wait_for_any() {
  local attempt
  for attempt in {1..30}; do
    local pattern
    for pattern in "$@"; do
      if [[ "$pattern" == id:* ]]; then
        if android_bounds_for_id "${pattern#id:}" >/dev/null 2>&1; then
          return 0
        fi
      elif [[ "$pattern" == desc:* ]]; then
        if android_bounds_for_desc "${pattern#desc:}" >/dev/null 2>&1; then
          return 0
        fi
      elif [[ "$pattern" == text:* ]]; then
        if android_bounds_for_text "${pattern#text:}" >/dev/null 2>&1; then
          return 0
        fi
      fi
    done
    sleep 1
  done
  return 1
}

open_android_qa() {
  open_url "zook:///qa"
  android_wait_for_any id:qa-launcher-screen id:qa-public-login id:qa-member-home desc:"QA shortcuts" text:"QA shortcuts" || true
  dismiss_capture_obstructions
  android_reset_qa_scroll
}

capture_image() {
  local destination="$1"
  if [[ "$platform" == "ios" ]]; then
    xcrun simctl io "$ios_udid" screenshot "$destination" >/dev/null
  else
    local remote_path="/sdcard/zook-capture-${RANDOM}.png"
    adb shell screencap -p "$remote_path" >/dev/null
    adb pull "$remote_path" "$destination" >/dev/null
    adb shell rm -f "$remote_path" >/dev/null
  fi
}

expected_marker_for_capture() {
  local bucket="$1"
  local name="$2"
  case "${bucket}/${name}" in
    owner/home) printf '%s\n' 'id:owner-home-screen' ;;
    owner/members) printf '%s\n' 'id:owner-members-screen' ;;
    owner/member-detail) printf '%s\n' 'id:owner-member-detail-screen' ;;
    owner/approvals) printf '%s\n' 'id:owner-approvals-screen' ;;
    owner/revenue) printf '%s\n' 'id:owner-revenue-screen' ;;
    owner/stock) printf '%s\n' 'id:owner-stock-screen' ;;
    owner/billing) printf '%s\n' 'id:owner-billing-screen' ;;
    owner/more) printf '%s\n' 'id:owner-more-screen' ;;
    owner/notifications) printf '%s\n' 'id:notifications-screen' ;;
    member/home) printf '%s\n' 'id:member-home-screen|text:Membership access|text:Hello, Nisha' ;;
    member/progress) printf '%s\n' 'id:progress-screen|text:Log workout|text:History' ;;
    member/scan) printf '%s\n' 'id:scan-screen|text:Scan to check in|id:scan-manual-code' ;;
    member/plan) printf '%s\n' 'id:member-plan-screen|text:Open today plan|text:Today'"'"'s workout' ;;
    member/shop) printf '%s\n' 'text:Search essentials|id:shop-all-screen|id:shop-featured-screen' ;;
    member/membership) printf '%s\n' 'id:membership-screen' ;;
    member/assistant) printf '%s\n' 'id:assistant-screen|id:assistant-coming-soon-screen|id:assistant-unavailable-screen' ;;
    member/classes) printf '%s\n' 'id:member-classes-screen' ;;
    member/notifications) printf '%s\n' 'id:notifications-screen' ;;
    member/tracking-history) printf '%s\n' 'id:tracking-history-screen' ;;
    member/tracking-entry) printf '%s\n' 'id:tracking-entry-screen' ;;
    *) return 1 ;;
  esac
}

assert_android_capture_target() {
  local bucket="$1"
  local name="$2"
  local marker
  marker="$(expected_marker_for_capture "$bucket" "$name")" || return 0
  IFS='|' read -r -a markers <<<"$marker"
  android_wait_for_any "${markers[@]}"
}

should_skip_android_assert() {
  local bucket="$1"
  local name="$2"
  case "${bucket}/${name}" in
    *) return 1 ;;
  esac
}

extra_settle_seconds_for_capture() {
  local bucket="$1"
  local name="$2"
  case "${bucket}/${name}" in
    member/scan) printf '%s\n' '10' ;;
    *) printf '%s\n' '0' ;;
  esac
}

capture_route_wait() {
  local bucket="$1"
  local name="$2"
  local url="$3"
  local wait_seconds="$4"
  if [[ "$platform" == "android" && "$url" == zook:///* ]]; then
    adb shell am force-stop com.zook.app >/dev/null 2>&1 || true
    sleep 1
  fi
  open_url "$url"
  sleep "$wait_seconds"
  if [[ "$platform" == "android" ]]; then
    if ! should_skip_android_assert "$bucket" "$name"; then
      assert_android_capture_target "$bucket" "$name"
    fi
  fi
  local extra_wait
  extra_wait="$(extra_settle_seconds_for_capture "$bucket" "$name")"
  if [[ "$extra_wait" != "0" ]]; then
    sleep "$extra_wait"
  fi
  dismiss_capture_obstructions
  capture_image "$output_dir/$bucket/$name.png"
}

capture_route() {
  local bucket="$1"
  local name="$2"
  local url="$3"
  capture_route_wait "$bucket" "$name" "$url" "$capture_settle_seconds"
}

capture_android_qa_shortcut() {
  local bucket="$1"
  local name="$2"
  local shortcut_id="$3"
  open_android_qa
  android_scroll_until_id "$shortcut_id"
  android_tap_id "$shortcut_id"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/$bucket/$name.png"
}

capture_android_tap() {
  local x="$1"
  local y="$2"
  adb shell input tap "$x" "$y" >/dev/null
}

capture_android_owner_tab() {
  local label="$1"
  local x="$2"
  local expected_id="$3"
  android_tap_desc "$label" >/dev/null 2>&1 || capture_android_tap "$x" 2288
  android_wait_for_any "id:${expected_id}"
}

capture_android_owner_tabs() {
  capture_route_wait "owner" "home" "zook:///__qa-role?role=OWNER&target=/owner" "$capture_settle_seconds"
  android_wait_for_any id:owner-home-screen desc:Members desc:Approvals desc:Revenue desc:More || true

  capture_android_owner_tab "Members" 320 "owner-members-screen"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/owner/members.png"

  capture_android_owner_tab "Approvals" 540 "owner-approvals-screen"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/owner/approvals.png"

  capture_android_owner_tab "Revenue" 772 "owner-revenue-screen"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/owner/revenue.png"

  capture_android_owner_tab "More" 988 "owner-more-screen"
  android_wait_for_any id:owner-more-screen id:owner-more-sign-out id:owner-more-stock
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/owner/more.png"
}

capture_android_member_tabs() {
  capture_route "member" "home" "zook:///__qa-role?role=MEMBER&target=/"
  capture_route "member" "progress" "zook:///__qa-role?role=MEMBER&target=/progress"
  capture_route "member" "scan" "zook:///__qa-role?role=MEMBER&target=/scan"
  capture_route "member" "plan" "zook:///__qa-role?role=MEMBER&target=/plan"
  capture_route "member" "shop" "zook:///__qa-role?role=MEMBER&target=/__qa-open%3Fkind%3Dmember-shop"
}

capture_android_trainer_tabs() {
  open_android_qa
  android_scroll_until_id "qa-trainer-home"
  android_tap_id "qa-trainer-home"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions

  capture_android_tap 143 2288
  sleep 4
  dismiss_capture_obstructions
  capture_image "$output_dir/trainer/home.png"

  capture_android_tap 407 2288
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/trainer/clients.png"

  capture_android_tap 671 2288
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/trainer/plans.png"

  capture_android_tap 936 2288
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/trainer/payouts.png"
}

capture_android_member_tracking_entry() {
  open_android_qa
  android_scroll_until_id "qa-member-progress"
  android_tap_id "qa-member-progress"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  android_tap_id "tracking-log-workout"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/member/tracking-entry.png"
}

capture_android_trainer_client_detail_set() {
  open_android_qa
  android_scroll_until_id "qa-trainer-home"
  android_tap_id "qa-trainer-home"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  android_tap_id "trainer-client-row-first"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/trainer/client-detail.png"

  android_tap_id "trainer-ai-draft-button"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/trainer/client-plan.png"

  android_tap_text "Sessions"
  sleep "$capture_settle_seconds"
  dismiss_capture_obstructions
  capture_image "$output_dir/trainer/client-sessions.png"
}

should_capture_group() {
  local group="$1"
  [[ "$capture_group" == "all" || "$capture_group" == "$group" ]]
}

warm_launch

if [[ "$platform" == "android" ]]; then
  if should_capture_group "public"; then
    capture_route "public" "login" "zook:///__qa-reset?target=/login"
    capture_route "public" "gyms" "zook:///gyms"
    capture_route "public" "gym-aarogya" "zook:///g/aarogya-strength"
  fi

  if should_capture_group "onboarding"; then
    capture_route "onboarding" "language" "zook:///onboarding/language"
    capture_route "onboarding" "value-props" "zook:///onboarding/value-props"
  fi

  if should_capture_group "member"; then
    capture_android_member_tabs
    capture_route "member" "membership" "zook:///__qa-role?role=MEMBER&target=/membership"
    capture_route "member" "classes" "zook:///__qa-role?role=MEMBER&target=/classes"
    capture_route "member" "assistant" "zook:///__qa-role?role=MEMBER&target=/assistant"
    capture_route "member" "notifications" "zook:///__qa-role?role=MEMBER&target=/notifications"
    capture_route "member" "tracking-history" "zook:///__qa-role?role=MEMBER&target=/tracking-history"
    capture_route "member" "tracking-entry" "zook:///__qa-role?role=MEMBER&target=/tracking-entry"
    capture_route "member" "attendance-detail" "zook:///__qa-role?role=MEMBER&target=/__qa-open%3Fkind%3Dmember-attendance-detail"
  fi

  if should_capture_group "owner"; then
    capture_android_owner_tabs
    capture_route "owner" "member-detail" "zook:///__qa-role?role=OWNER&target=/__qa-open%3Fkind%3Downer-member-detail"
    capture_route "owner" "stock" "zook:///__qa-role?role=OWNER&target=/owner/stock"
    capture_route "owner" "billing" "zook:///__qa-role?role=OWNER&target=/owner/billing"
    capture_route "owner" "notifications" "zook:///__qa-role?role=OWNER&target=/notifications"
  fi

  if should_capture_group "admin"; then
    capture_route "admin" "home" "zook:///__demo-role?reset=1&role=ADMIN&target=/owner"
    capture_route "admin" "approvals" "zook:///__demo-role?reset=1&role=ADMIN&target=/owner/approvals"
    capture_route "admin" "stock" "zook:///__demo-role?reset=1&role=ADMIN&target=/owner/stock"
    capture_route "admin" "more" "zook:///__demo-role?reset=1&role=ADMIN&target=/owner/more"
  fi

  if should_capture_group "trainer"; then
    capture_route_wait "trainer" "home" "zook:///__demo-role?reset=1&role=TRAINER&target=/trainer" "8"
    capture_route_wait "trainer" "clients" "zook:///__demo-role?reset=1&role=TRAINER&target=/trainer?view=clients" "8"
    capture_route_wait "trainer" "plans" "zook:///__demo-role?reset=1&role=TRAINER&target=/trainer?view=plans" "8"
    capture_route_wait "trainer" "payouts" "zook:///__demo-role?reset=1&role=TRAINER&target=/trainer?view=payouts" "8"
    capture_route "trainer" "client-detail" "zook:///__demo-role?reset=1&role=TRAINER&target=/__qa-open%3Fkind%3Dtrainer-client-detail"
    capture_route "trainer" "client-plan" "zook:///__demo-role?reset=1&role=TRAINER&target=/__qa-open%3Fkind%3Dtrainer-client-plan"
    capture_route "trainer" "client-sessions" "zook:///__demo-role?reset=1&role=TRAINER&target=/__qa-open%3Fkind%3Dtrainer-client-sessions"
  fi

  if should_capture_group "reception"; then
    capture_route "reception" "home" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/reception"
    capture_route "reception" "members" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/reception/members"
    capture_route "reception" "member-detail" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/__qa-open%3Fkind%3Dreception-member-detail"
    capture_route "reception" "payments" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/reception/payments"
    capture_route "reception" "orders" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/reception/orders"
    capture_route "reception" "scan" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/scan"
    capture_route "reception" "verification" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/__qa-open%3Fkind%3Dreception-verification"
  fi
else
  if should_capture_group "public"; then
    capture_route "public" "login" "zook:///__qa-reset?target=/login"
    capture_route "public" "gyms" "zook:///gyms"
    capture_route "public" "gym-aarogya" "zook:///g/aarogya-strength"
  fi

  if should_capture_group "onboarding"; then
    capture_route "onboarding" "language" "zook:///onboarding/language"
    capture_route "onboarding" "value-props" "zook:///onboarding/value-props"
  fi

  if should_capture_group "member"; then
    capture_route "member" "home" "zook:///__demo-role?reset=1&role=MEMBER&target=/"
    capture_route "member" "progress" "zook:///__demo-role?reset=1&role=MEMBER&target=/progress"
    capture_route "member" "scan" "zook:///__demo-role?reset=1&role=MEMBER&target=/scan"
    capture_route "member" "plan" "zook:///__demo-role?reset=1&role=MEMBER&target=/plan"
    capture_route "member" "membership" "zook:///__demo-role?reset=1&role=MEMBER&target=/membership"
    capture_route "member" "classes" "zook:///__demo-role?reset=1&role=MEMBER&target=/classes"
    capture_route "member" "shop" "zook:///__demo-role?reset=1&role=MEMBER&target=/shop"
    capture_route "member" "assistant" "zook:///__demo-role?reset=1&role=MEMBER&target=/assistant"
    capture_route "member" "notifications" "zook:///__demo-role?reset=1&role=MEMBER&target=/notifications"
    capture_route "member" "tracking-history" "zook:///__demo-role?reset=1&role=MEMBER&target=/tracking-history"
    capture_route "member" "tracking-entry" "zook:///__demo-role?reset=1&role=MEMBER&target=/tracking-entry"
    capture_route "member" "attendance-detail" "zook:///__demo-role?reset=1&role=MEMBER&target=/__qa-open%3Fkind%3Dmember-attendance-detail"
  fi

  if should_capture_group "owner"; then
    capture_route "owner" "home" "zook:///__demo-role?reset=1&role=OWNER&target=/owner"
    capture_route "owner" "members" "zook:///__demo-role?reset=1&role=OWNER&target=/owner/members"
    capture_route "owner" "member-detail" "zook:///__demo-role?reset=1&role=OWNER&target=/__qa-open%3Fkind%3Downer-member-detail"
    capture_route "owner" "approvals" "zook:///__demo-role?reset=1&role=OWNER&target=/owner/approvals"
    capture_route "owner" "revenue" "zook:///__demo-role?reset=1&role=OWNER&target=/owner/revenue"
    capture_route "owner" "stock" "zook:///__demo-role?reset=1&role=OWNER&target=/owner/stock"
    capture_route "owner" "billing" "zook:///__demo-role?reset=1&role=OWNER&target=/owner/billing"
    capture_route "owner" "more" "zook:///__demo-role?reset=1&role=OWNER&target=/owner/more"
    capture_route "owner" "notifications" "zook:///__demo-role?reset=1&role=OWNER&target=/notifications"
  fi

  if should_capture_group "admin"; then
    capture_route "admin" "home" "zook:///__demo-role?reset=1&role=ADMIN&target=/owner"
    capture_route "admin" "approvals" "zook:///__demo-role?reset=1&role=ADMIN&target=/owner/approvals"
    capture_route "admin" "stock" "zook:///__demo-role?reset=1&role=ADMIN&target=/owner/stock"
    capture_route "admin" "more" "zook:///__demo-role?reset=1&role=ADMIN&target=/owner/more"
  fi

  if should_capture_group "trainer"; then
    capture_route_wait "trainer" "home" "zook:///__demo-role?reset=1&role=TRAINER&target=/trainer" "20"
    capture_route_wait "trainer" "clients" "zook:///__demo-role?reset=1&role=TRAINER&target=/trainer?view=clients" "20"
    capture_route_wait "trainer" "plans" "zook:///__demo-role?reset=1&role=TRAINER&target=/trainer?view=plans" "20"
    capture_route_wait "trainer" "payouts" "zook:///__demo-role?reset=1&role=TRAINER&target=/trainer?view=payouts" "20"
    capture_route "trainer" "client-detail" "zook:///__demo-role?reset=1&role=TRAINER&target=/__qa-open%3Fkind%3Dtrainer-client-detail"
    capture_route "trainer" "client-plan" "zook:///__demo-role?reset=1&role=TRAINER&target=/__qa-open%3Fkind%3Dtrainer-client-plan"
    capture_route "trainer" "client-sessions" "zook:///__demo-role?reset=1&role=TRAINER&target=/__qa-open%3Fkind%3Dtrainer-client-sessions"
  fi

  if should_capture_group "reception"; then
    capture_route "reception" "home" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/reception"
    capture_route "reception" "members" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/reception/members"
    capture_route "reception" "member-detail" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/__qa-open%3Fkind%3Dreception-member-detail"
    capture_route "reception" "payments" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/reception/payments"
    capture_route "reception" "orders" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/reception/orders"
    capture_route "reception" "scan" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/scan"
    capture_route "reception" "verification" "zook:///__demo-role?reset=1&role=RECEPTIONIST&target=/__qa-open%3Fkind%3Dreception-verification"
  fi
fi

echo "Capture complete: $output_dir"
