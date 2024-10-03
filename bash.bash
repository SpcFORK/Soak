SOAK_INCLUDES="std,str,math,sort,random,fs,fmt,json,datetime,path,http,test,debug,cli,md,crypto,syntax"
oak build --entry src/main.oak --output dist/soak.oak --include $SOAK_INCLUDES
oak build --entry src/main.oak --output dist/soak.js --web --include $SOAK_INCLUDES

oak pack --entry src/main.oak --output dist/soak --include $SOAK_INCLUDES
chmod +x dist/soak