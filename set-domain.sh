#!/bin/sh
# usage: ./set-domain.sh linta.com hello@linta.com
D="$1"; M="$2"
[ -z "$D" ] && { echo "usage: $0 domain.com [email]"; exit 1; }
sed -i "s/YOUR-DOMAIN\.com/$D/g" *.html
[ -n "$M" ] && sed -i "s/lintaagency@gmail\.com/$M/g" *.html linta.js
echo done
