import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.K6_VUS || 100),
  duration: __ENV.K6_DURATION || "5m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<750"],
  },
};

const baseUrl = __ENV.ZOOK_BASE_URL || "http://127.0.0.1:3000";

export default function pilotSmoke() {
  const publicPage = http.get(`${baseUrl}/gyms`);
  check(publicPage, {
    "gyms page responds": (response) => response.status >= 200 && response.status < 500,
  });

  const health = http.get(`${baseUrl}/api/health`);
  check(health, {
    "health responds": (response) => response.status === 200,
  });

  sleep(1);
}
