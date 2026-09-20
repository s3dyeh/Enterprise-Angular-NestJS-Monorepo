import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  stages: [{ duration: '1m', target: 20 }, { duration: '3m', target: 100 }, { duration: '1m', target: 0 }],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
};
export default function () {
  if (!__ENV.BASE_URL || !__ENV.ACCESS_TOKEN) throw new Error('Supply a staging BASE_URL and a short-lived read-only ACCESS_TOKEN');
  const response = http.get(__ENV.BASE_URL + '/api/v1/admin/cities?page=1&page_size=25', {
    headers: { Authorization: 'Bearer ' + __ENV.ACCESS_TOKEN },
    tags: { name: 'cities-list' },
  });
  check(response, { 'authorized list succeeds': value => value.status === 200 });
  sleep(1);
}

