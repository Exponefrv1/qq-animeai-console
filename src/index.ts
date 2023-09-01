import path from 'path';
import fs from 'fs/promises';
import { parse } from 'ts-command-line-args';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

const fh = require('./faceHack.ts');
const qq = require('./sendRequests.ts');

interface ITransformArguments {
	image: string;
	output: string;
	mode?: string;
	proxy?: string;
	help?: boolean;
};

const args = parse<ITransformArguments>({
		image: {type: String, alias: 'i', description: 'Source image file path (./ for cwd)'},
		output: {type: String, alias: 'o', description: 'Result image path'},
		mode: {type: String, optional: true, alias: 'm', description: 'QQ generation modes:\n\nAI_PAINTING_ANIME\nDIFFERENT_DIMENSION_ME\n\nAI_PAINTING_ANIME is for China only. DIFFERENT_DIMENSION_ME - for other countries.\nDefault mode is - DIFFERENT_DIMENSION_ME'},
		proxy: {type: String, optional: true, alias: 'p', description: 'Proxy in following format: http://user:password@ip:port'},
		help: {type: Boolean, optional: true, alias: 'h', description: 'Prints usage guide'},
	},
	{helpArg: 'help'}
);

const makeObject = async (image: Buffer, mode: string) => {

	let busiId = '';

	if (mode === 'DIFFERENT_DIMENSION_ME') { busiId = 'different_dimension_me_img_entry';}
	else if (mode === 'AI_PAINTING_ANIME') { busiId = 'ai_painting_anime_img_entry'; }
	else { throw new Error('Wrong mode parameter specified'); }

	const obj = {
		busiId: busiId,
		extra: JSON.stringify({
			face_rects: [],
			version: 2,
			platform: 'web',
		}),
		images: [image.toString('base64')]
	};
	return obj;
};

(async () => {
	let httpsAgent: HttpsProxyAgent<string> | SocksProxyAgent | undefined;
	const imagePath = args.image;
	const outputImagePath = args.output;
	const proxy = args.proxy;
	const mode = args.mode || 'DIFFERENT_DIMENSION_ME';
	try {
		if (proxy) {
			if (/^socks5/.test(proxy)) {
				httpsAgent = new SocksProxyAgent(proxy);
			} else {
				httpsAgent = new HttpsProxyAgent(proxy);
			}
		}
		const buffer = await fs.readFile(imagePath);
		let data;
		try {
			const obj = await makeObject(buffer, mode);
			data = await qq.sendRequest(obj, mode, httpsAgent);
		} catch (e) {
			const error = (e as Error).toString().replace("Error: ", "");
			if (error == 'Error: Face not found. Try another photo.') {
				console.log('Face not found. Trying face hack...');
				const obj = await makeObject(await fh.faceHack(buffer), mode);
				data = await qq.sendRequest(obj, mode, httpsAgent);
			} else {
				throw new Error(error);
			}
		}
		const extra = JSON.parse(data.extra);
		const imgData = await qq.download(extra.img_urls[1] as string, httpsAgent);
		await fs.writeFile(path.join(outputImagePath), imgData);
		console.log(`Successfully downloaded transformed image to:\n${outputImagePath}`);
	} catch (e) {
		console.error(`${(e as Error).toString()}`)
	}
})();
