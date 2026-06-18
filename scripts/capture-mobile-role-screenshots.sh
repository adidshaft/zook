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

encode_uri_component() {
  python3 - "$1" <<'PY'
import sys
from urllib.parse import quote

print(quote(sys.argv[1], safe=""))
PY
}

role_payload_url() {
  local route="$1"
  local reset_flag="$2"
  local role_name="$3"
  local target_path="$4"
  local view_name="${5:-}"
  local payload
  if [[ -n "$view_name" ]]; then
    payload="$(printf '{"reset":"%s","role":"%s","target":"%s","view":"%s"}' "$reset_flag" "$role_name" "$target_path" "$view_name")"
  else
    payload="$(printf '{"reset":"%s","role":"%s","target":"%s"}' "$reset_flag" "$role_name" "$target_path")"
  fi
  printf 'zook:///%s?payload=%s\n' "$route" "$(encode_uri_component "$payload")"
}

demo_role_url() {
  role_payload_url "__demo-role" "1" "$@"
}

qa_role_url() {
  role_payload_url "__qa-role" "1" "$@"
}

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
    xcrun simctl openurl "$ios_udid" "$url" >/dev/null
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

android_warning_tray_present() {
  dump_android_ui || return 1
  python3 - "$android_ui_dump_path" <<'PY'
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    xml = handle.read().lower()
needles = ("open debugger to view warnings", "open debugger", "view warnings")
raise SystemExit(0 if any(needle in xml for needle in needles) else 1)
PY
}

android_warning_tray_bounds() {
  dump_android_ui || return 1
  python3 - "$android_ui_dump_path" <<'PY'
import re
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    xml = handle.read()
pattern = re.compile(r'text="([^"]*)".*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
for match in pattern.finditer(xml):
    text = match.group(1).lower()
    if "open debugger" in text or "view warnings" in text:
        print(" ".join(match.groups()[1:]))
        raise SystemExit(0)
raise SystemExit(1)
PY
}

dismiss_capture_obstructions() {
  if [[ "$platform" == "android" ]]; then
    # Expo/Metro warning trays can cover the bottom navigation during QA
    # captures. The warning appears in different vertical positions depending on
    # the runtime and emulator size, so derive a close-button sweep from the
    # current display size instead of relying on one fixed resolution.
    local wm_size
    wm_size="$(adb shell wm size 2>/dev/null | tr -d '\r' | awk -F': ' '/Physical size/ { print $2; exit }')"
    local width="1080"
    local height="2400"
    if [[ "$wm_size" =~ ^([0-9]+)x([0-9]+)$ ]]; then
      width="${BASH_REMATCH[1]}"
      height="${BASH_REMATCH[2]}"
    fi
    local close_x=$((width - 52))
    local warning_bounds
    local x1
    local y1
    local x2
    local y2
    local close_y
    if warning_bounds="$(android_warning_tray_bounds 2>/dev/null)"; then
      read -r x1 y1 x2 y2 <<<"$warning_bounds"
      close_y=$(((y1 + y2) / 2))
      adb shell input tap "$close_x" "$close_y" >/dev/null 2>&1 || true
      sleep 0.4
      if ! android_warning_tray_present >/dev/null 2>&1; then
        return 0
      fi
    fi
    local top_y1=$((height * 5 / 100))
    local top_y2=$((height * 8 / 100))
    local top_y3=$((height * 11 / 100))
    local bottom_y=$((height - 210))
    local coords=(
      "${close_x} ${top_y1}"
      "${close_x} ${top_y2}"
      "${close_x} ${top_y3}"
      "${close_x} ${bottom_y}"
    )
    local pair
    local attempt
    for attempt in 1 2 3; do
      for pair in "${coords[@]}"; do
        adb shell input tap ${pair} >/dev/null 2>&1 || true
        sleep 0.2
      done
      sleep 0.5
      if ! android_warning_tray_present >/dev/null 2>&1; then
        return 0
      fi
    done
    sleep 0.4
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
    dismiss_capture_obstructions
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
    member/plan) printf "%s\n" "id:member-plan-screen|text:Open today plan|text:Today's workout" ;;
    member/shop) printf '%s\n' 'text:Search essentials|id:shop-all-screen|id:shop-featured-screen' ;;
    member/membership) printf '%s\n' 'id:membership-screen' ;;
    member/assistant) printf '%s\n' 'id:assistant-screen|id:assistant-coming-soon-screen|id:assistant-unavailable-screen' ;;
    member/classes) printf '%s\n' 'id:member-classes-screen' ;;
    member/notifications) printf '%s\n' 'id:notifications-screen' ;;
    member/history) printf '%s\n' 'id:tracking-history-screen' ;;
    member/tracking-entry) printf '%s\n' 'id:tracking-entry-screen' ;;
    trainer/home) printf '%s\n' 'text:The next coaching actions to clear first.|text:Plan queue clear|text:Active plan work' ;;
    trainer/clients) printf '%s\n' 'text:client list is access-controlled|text:No clients yet|text:No matching clients' ;;
    trainer/plans) printf '%s\n' 'text:Plan work|text:Review active plans|text:Planning queue clear' ;;
    trainer/payouts) printf '%s\n' 'text:Live PT earnings and paid history|text:This month accrued|text:No earnings yet' ;;
    trainer/client-detail) printf '%s\n' 'id:trainer-client-detail-screen|id:trainer-ai-draft-button' ;;
    trainer/client-plan) printf '%s\n' 'id:trainer-client-plan-screen|id:trainer-plan-title' ;;
    trainer/client-sessions) printf '%s\n' 'id:trainer-client-sessions-screen|text:Sessions logged' ;;
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
    member/scan|reception/scan)
      return 0
      ;;
    *) return 1 ;;
  esac
}

extra_settle_seconds_for_capture() {
  local bucket="$1"
  local name="$2"
  case "${bucket}/${name}" in
    member/scan) printf '%s\n' '10' ;;
    member/shop|member/attendance-detail) printf '%s\n' '8' ;;
    owner/member-detail|owner/more) printf '%s\n' '6' ;;
    reception/member-detail|reception/verification) printf '%s\n' '8' ;;
    trainer/client-detail|trainer/client-plan|trainer/client-sessions) printf '%s\n' '6' ;;
    *) printf '%s\n' '0' ;;
  esac
}

capture_route_wait() {
  local bucket="$1"
  local name="$2"
  local url="$3"
  local wait_seconds="$4"
  if [[ "$platform" == "ios" && "$url" == zook:///* ]]; then
    xcrun simctl terminate "$ios_udid" com.zook.app >/dev/null 2>&1 || true
    sleep 1
  fi
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
  local attempt
  for attempt in 1 2 3; do
    android_scroll_until_id "$shortcut_id"
    if android_tap_id "$shortcut_id"; then
      break
    fi
    sleep 1
  done
  sleep "$capture_settle_seconds"
  if ! should_skip_android_assert "$bucket" "$name"; then
    assert_android_capture_target "$bucket" "$name"
  fi
  dismiss_capture_obstructions
  capture_image "$output_dir/$bucket/$name.png"
}

capture_android_tap() {
  local x="$1"
  local y="$2"
  adb shell input tap "$x" "$y" >/dev/null
}

capture_android_member_tabs() {
  capture_route "member" "home" "$(demo_role_url MEMBER / home)"
  capture_route "member" "progress" "$(demo_role_url MEMBER /progress)"
  capture_route "member" "scan" "$(demo_role_url MEMBER /scan)"
  capture_route "member" "plan" "$(demo_role_url MEMBER /plan)"
  capture_route "member" "shop" "$(demo_role_url MEMBER /__qa-open?kind=member-shop)"
}

capture_android_trainer_tabs() {
  capture_route_wait "trainer" "home" "$(demo_role_url TRAINER /trainer)" "8"
  capture_route_wait "trainer" "clients" "$(demo_role_url TRAINER /trainer clients)" "8"
  capture_route_wait "trainer" "plans" "$(demo_role_url TRAINER /trainer plans)" "8"
  capture_route_wait "trainer" "payouts" "$(demo_role_url TRAINER /trainer payouts)" "8"
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
    capture_route "member" "membership" "$(demo_role_url MEMBER /membership)"
    capture_route "member" "classes" "$(demo_role_url MEMBER /classes)"
    capture_route "member" "assistant" "$(demo_role_url MEMBER /assistant)"
    capture_route "member" "notifications" "$(demo_role_url MEMBER /notifications)"
    capture_route "member" "history" "$(demo_role_url MEMBER /tracking-history)"
    capture_route "member" "tracking-entry" "$(demo_role_url MEMBER /tracking-entry)"
    capture_route "member" "attendance-detail" "$(demo_role_url MEMBER /__qa-open?kind=member-attendance-detail)"
  fi

  if should_capture_group "owner"; then
    capture_route "owner" "home" "$(demo_role_url OWNER /owner)"
    capture_route "owner" "members" "$(demo_role_url OWNER /owner/members)"
    capture_route "owner" "approvals" "$(demo_role_url OWNER /owner/approvals)"
    capture_route "owner" "revenue" "$(demo_role_url OWNER /owner/revenue)"
    capture_route "owner" "more" "$(demo_role_url OWNER /owner/more)"
    capture_route "owner" "member-detail" "$(demo_role_url OWNER /__qa-open?kind=owner-member-detail)"
    capture_route "owner" "stock" "$(demo_role_url OWNER /owner/stock)"
    capture_route "owner" "billing" "$(demo_role_url OWNER /owner/billing)"
    capture_route "owner" "notifications" "$(demo_role_url OWNER /notifications)"
  fi

  if should_capture_group "admin"; then
    capture_route "admin" "home" "$(qa_role_url ADMIN /owner)"
    capture_route "admin" "approvals" "$(qa_role_url ADMIN /owner/approvals)"
    capture_route "admin" "stock" "$(qa_role_url ADMIN /owner/stock)"
    capture_route "admin" "more" "$(qa_role_url ADMIN /owner/more)"
  fi

  if should_capture_group "trainer"; then
    capture_android_trainer_tabs
    capture_route "trainer" "client-detail" "$(demo_role_url TRAINER /__qa-open?kind=trainer-client-detail)"
    capture_route "trainer" "client-plan" "$(demo_role_url TRAINER /__qa-open?kind=trainer-client-plan)"
    capture_route "trainer" "client-sessions" "$(demo_role_url TRAINER /__qa-open?kind=trainer-client-sessions)"
  fi

  if should_capture_group "reception"; then
    capture_route "reception" "home" "$(demo_role_url RECEPTIONIST /reception home)"
    capture_route "reception" "members" "$(demo_role_url RECEPTIONIST /reception/members)"
    capture_route "reception" "member-detail" "$(demo_role_url RECEPTIONIST /__qa-open?kind=reception-member-detail)"
    capture_route "reception" "payments" "$(demo_role_url RECEPTIONIST /reception/payments)"
    capture_route "reception" "orders" "$(demo_role_url RECEPTIONIST /reception/orders)"
    capture_route "reception" "scan" "$(demo_role_url RECEPTIONIST /scan)"
    capture_route "reception" "verification" "$(demo_role_url RECEPTIONIST /__qa-open?kind=reception-verification)"
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
    capture_route "member" "home" "$(demo_role_url MEMBER / home)"
    capture_route "member" "progress" "$(demo_role_url MEMBER /progress)"
    capture_route "member" "scan" "$(demo_role_url MEMBER /scan)"
    capture_route "member" "plan" "$(demo_role_url MEMBER /plan)"
    capture_route "member" "membership" "$(demo_role_url MEMBER /membership)"
    capture_route "member" "classes" "$(demo_role_url MEMBER /classes)"
    capture_route "member" "shop" "$(demo_role_url MEMBER /shop)"
    capture_route "member" "assistant" "$(demo_role_url MEMBER /assistant)"
    capture_route "member" "notifications" "$(demo_role_url MEMBER /notifications)"
    capture_route "member" "history" "$(demo_role_url MEMBER /tracking-history)"
    capture_route "member" "tracking-entry" "$(demo_role_url MEMBER /tracking-entry)"
    capture_route "member" "attendance-detail" "$(demo_role_url MEMBER /__qa-open?kind=member-attendance-detail)"
  fi

  if should_capture_group "owner"; then
    capture_route "owner" "home" "$(demo_role_url OWNER /owner)"
    capture_route "owner" "members" "$(demo_role_url OWNER /owner/members)"
    capture_route "owner" "member-detail" "$(demo_role_url OWNER /__qa-open?kind=owner-member-detail)"
    capture_route "owner" "approvals" "$(demo_role_url OWNER /owner/approvals)"
    capture_route "owner" "revenue" "$(demo_role_url OWNER /owner/revenue)"
    capture_route "owner" "stock" "$(demo_role_url OWNER /owner/stock)"
    capture_route "owner" "billing" "$(demo_role_url OWNER /owner/billing)"
    capture_route "owner" "more" "$(demo_role_url OWNER /owner/more)"
    capture_route "owner" "notifications" "$(demo_role_url OWNER /notifications)"
  fi

  if should_capture_group "admin"; then
    capture_route "admin" "home" "$(qa_role_url ADMIN /owner)"
    capture_route "admin" "approvals" "$(qa_role_url ADMIN /owner/approvals)"
    capture_route "admin" "stock" "$(qa_role_url ADMIN /owner/stock)"
    capture_route "admin" "more" "$(qa_role_url ADMIN /owner/more)"
  fi

  if should_capture_group "trainer"; then
    capture_route_wait "trainer" "home" "$(demo_role_url TRAINER /trainer)" "20"
    capture_route_wait "trainer" "clients" "$(demo_role_url TRAINER /trainer clients)" "20"
    capture_route_wait "trainer" "plans" "$(demo_role_url TRAINER /trainer plans)" "20"
    capture_route_wait "trainer" "payouts" "$(demo_role_url TRAINER /trainer payouts)" "20"
    capture_route "trainer" "client-detail" "$(demo_role_url TRAINER /__qa-open?kind=trainer-client-detail)"
    capture_route "trainer" "client-plan" "$(demo_role_url TRAINER /__qa-open?kind=trainer-client-plan)"
    capture_route "trainer" "client-sessions" "$(demo_role_url TRAINER /__qa-open?kind=trainer-client-sessions)"
  fi

  if should_capture_group "reception"; then
    capture_route "reception" "home" "$(demo_role_url RECEPTIONIST /reception home)"
    capture_route "reception" "members" "$(demo_role_url RECEPTIONIST /reception/members)"
    capture_route "reception" "member-detail" "$(demo_role_url RECEPTIONIST /__qa-open?kind=reception-member-detail)"
    capture_route "reception" "payments" "$(demo_role_url RECEPTIONIST /reception/payments)"
    capture_route "reception" "orders" "$(demo_role_url RECEPTIONIST /reception/orders)"
    capture_route "reception" "scan" "$(demo_role_url RECEPTIONIST /scan)"
    capture_route "reception" "verification" "$(demo_role_url RECEPTIONIST /__qa-open?kind=reception-verification)"
  fi
fi

echo "Capture complete: $output_dir"
