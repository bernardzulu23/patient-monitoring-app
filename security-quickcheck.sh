#!/usr/bin/env bash
# Usage: ./security-quickcheck.sh https://your-staging-url
URL="${1:?Usage: $0 https://site}"
HOST="${URL#*://}"; HOST="${HOST%%/*}"
fail=0
check() { if [ "$2" = "0" ]; then echo "PASS  $1"; else echo "FAIL  $1"; fail=1; fi; }

H=$(curl -skI "$URL")
echo "$H" | grep -qi "^strict-transport-security"      ; check "H2 HSTS" $?
echo "$H" | grep -qi "^content-security-policy"        ; check "H3 CSP" $?
echo "$H" | grep -Eqi "^x-frame-options|frame-ancestors"; check "H4 Clickjacking" $?
echo "$H" | grep -qi "^x-content-type-options: *nosniff"; check "H5 nosniff" $?
echo "$H" | grep -qi "^referrer-policy"                ; check "H6 Referrer-Policy" $?
echo "$H" | grep -Eqi "^x-powered-by|^server: .*[0-9]\.[0-9]"; [ $? -ne 0 ]; check "H8 No version leakage" $?

curl -sI "http://$HOST" | grep -Eqi "^location: https://"; check "H1 HTTP->HTTPS" $?

for p in .env .git/config .git/HEAD backup.zip backup.sql db.sql phpinfo.php server-status .DS_Store config.json; do
  code=$(curl -sko /dev/null -w "%{http_code}" "$URL/$p")
  [ "$code" != "200" ]; check "P5 /$p not exposed (got $code)" $?
done

CORS=$(curl -skI -H "Origin: https://evil.example" "$URL/api" | grep -i "^access-control-allow-origin")
echo "$CORS" | grep -Eqi "evil.example|\*"; [ $? -ne 0 ]; check "C2 CORS not reflecting arbitrary origin" $?

C=$(curl -skI "$URL" | grep -i "^set-cookie")
if [ -n "$C" ]; then
  echo "$C" | grep -qi "httponly" ; check "A6 cookie HttpOnly" $?
  echo "$C" | grep -qi "secure"   ; check "A6 cookie Secure" $?
  echo "$C" | grep -qi "samesite" ; check "A6 cookie SameSite" $?
fi

# Rate limit smoke test on login
codes=$(for i in $(seq 1 30); do curl -sko /dev/null -w "%{http_code}\n" -X POST "$URL/api/login" -H 'Content-Type: application/json' -d '{"email":"x@x.com","password":"wrong"}'; done)
echo "$codes" | grep -q 429; check "P1 login rate limiting (429 seen)" $?

exit $fail
