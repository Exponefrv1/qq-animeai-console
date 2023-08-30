# qq-animeai-console
Lite console application for making requests to QQ anime ai.  
There is no face hack and no crop for now.   
Example result:  
![Example](https://i.imgur.com/cXJaTq2.jpeg)

## Usage
You need to have Node.js and NPM installed.  

*  Run `npm install`
*  Run `ts-node ./src/index.ts --image {YOUR IMAGE PATH} --output {RESULT IMAGE PATH}`

*Run `ts-node ./src/index.ts --help` or `npm start` for more options*

### ⚠️ Currently the Chinese server might throw 403 errors with DIFFERENT_DIMENSION_ME mode, note that it's default mode!

## Author
Original code of requests - https://github.com/lmcsu/qq-neural-anime-tg
