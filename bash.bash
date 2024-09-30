oak build --entry src/main.oak --output dist/soak.oak
oak build --entry src/main.oak --output dist/soak.js --web

oak pack --entry src/main.oak --output dist/soak
chmod +x dist/soak