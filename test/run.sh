#!/bin/sh
# Bit-exactness check: JS engine vs. exported C++ (several compiler settings). Needs node + g++.
set -e
cd "$(dirname "$0")"
T=$(mktemp -d)
node make-test-dls.js "$T/test.dls"
node verify.js "$T/test.dls" "$T" | tee "$T/js.txt"
fail=0
while read -r name hash rest; do
  for flags in "-O2" "-O0" "-O3 -march=x86-64-v2"; do
    g++ $flags -ffp-contract=off -msse2 -mfpmath=sse -I"$T" -DSONG="\"$name.h\"" main_test.cpp -o "$T/t"
    got=$("$T/t" "$T/test.dls")
    if [ "$got" = "$hash" ]; then echo "OK   $name [$flags] $got"; else echo "FAIL $name [$flags] js=$hash cpp=$got"; fail=1; fi
  done
done < "$T/js.txt"
rm -rf "$T"
exit $fail
