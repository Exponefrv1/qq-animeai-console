# qq-animeai-console
Lite console application for making requests to QQ anime ai.  
There is no face hack for now.   
Example result:  

![Example](https://i.imgur.com/cXJaTq2.jpeg)

## Usage
You need to have Node.js and NPM installed.  

*  Run `npm install`
*  Run `npm start` for help

Usage example:  
`ts-node ./src/index.ts --image ./dude.jpg --output ./anime_dude.jpg --mode AI_PAINTING_ANIME --proxy http://7uZ8CYFK:GFsMHb1M@45.137.52.141:62636`

### ⚠️ Currently the Chinese server might throw 403 errors with DIFFERENT_DIMENSION_ME mode, note that it's default mode!

## Credits
Original code of requests - https://github.com/lmcsu/qq-neural-anime-tg
